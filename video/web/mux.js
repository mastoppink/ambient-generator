import {
  Input, Output, BlobSource, ALL_FORMATS, Mp4OutputFormat, BufferTarget, StreamTarget,
  EncodedPacketSink, EncodedVideoPacketSource, EncodedAudioPacketSource,
  AudioSampleSink, AudioSampleSource, canEncodeAudio,
} from "mediabunny";
import { registerAacEncoder } from "@mediabunny/aac-encoder";

let aacRegistered = false;

/**
 * Repeats the (seamless) loop video for the whole audio length and adds the audio.
 * Video packets are copied, never re-encoded, so hours of video are produced quickly.
 * Audio is copied when MP4 supports its codec, otherwise re-encoded to AAC.
 *
 * @param {Blob} loopBlob  rendered loop (mp4)
 * @param {File} audioFile
 * @param {{ writable?: WritableStream, onProgress?: (p:number)=>void, signal?: AbortSignal }} opts
 * @returns {Promise<Blob|null>} Blob when no writable was given (in-memory), else null
 */
export async function muxLoopWithAudio(loopBlob, audioFile, { writable, onProgress, signal } = {}) {
  const vIn = new Input({ source: new BlobSource(loopBlob), formats: ALL_FORMATS });
  const aIn = new Input({ source: new BlobSource(audioFile), formats: ALL_FORMATS });
  const vTrack = await vIn.getPrimaryVideoTrack();
  const aTrack = await aIn.getPrimaryAudioTrack();
  if (!vTrack) throw new Error("Loop video tidak punya track video.");
  if (!aTrack) throw new Error("File audio tidak terbaca atau tidak punya track audio.");

  const loopDur = await vTrack.computeDuration();
  const total = await aTrack.computeDuration();

  // Load loop packets once (a 30 s loop is small).
  const vPackets = [];
  for await (const pkt of new EncodedPacketSink(vTrack).packets()) vPackets.push(pkt);
  const vConfig = await vTrack.getDecoderConfig();

  const format = new Mp4OutputFormat({ fastStart: writable ? false : "in-memory" });
  const target = writable ? new StreamTarget(writable, { chunked: true }) : new BufferTarget();
  const out = new Output({ format, target });

  const vSrc = new EncodedVideoPacketSource(vTrack.codec);
  out.addVideoTrack(vSrc, { frameRate: vTrack.frameRate || undefined });

  const passthrough = format.getSupportedAudioCodecs().includes(aTrack.codec) && aTrack.codec !== "pcm-s16";
  let aSrc;
  if (passthrough) {
    aSrc = new EncodedAudioPacketSource(aTrack.codec);
  } else {
    if (!(await canEncodeAudio("aac")) && !aacRegistered) { registerAacEncoder(); aacRegistered = true; }
    aSrc = new AudioSampleSource({ codec: "aac", bitrate: 320_000 });
  }
  out.addAudioTrack(aSrc);
  await out.start();

  // Interleave: write video up to the current audio time, then the next chunk of audio.
  let rep = 0, vi = 0, firstV = true;
  const writeVideoUntil = async (t) => {
    while (true) {
      const base = rep * loopDur;
      if (base >= total) return;
      const pkt = vPackets[vi];
      const ts = base + pkt.timestamp;
      if (ts > t) return;
      if (ts < total) {
        await vSrc.add(pkt.clone({ timestamp: ts }), firstV ? { decoderConfig: vConfig } : undefined);
        firstV = false;
      }
      if (++vi >= vPackets.length) { vi = 0; rep++; }
    }
  };

  const check = () => { if (signal?.aborted) throw new DOMException("Dibatalkan", "AbortError"); };
  let lastReport = 0;
  const report = (t) => {
    if (onProgress && (t - lastReport > 1 || t >= total)) { lastReport = t; onProgress(Math.min(1, t / total)); }
  };

  if (passthrough) {
    const aConfig = await aTrack.getDecoderConfig();
    let first = true;
    for await (const pkt of new EncodedPacketSink(aTrack).packets()) {
      check();
      await writeVideoUntil(pkt.timestamp + 1);
      await aSrc.add(pkt, first ? { decoderConfig: aConfig } : undefined);
      first = false;
      report(pkt.timestamp);
    }
  } else {
    for await (const sample of new AudioSampleSink(aTrack).samples()) {
      check();
      await writeVideoUntil(sample.timestamp + 1);
      await aSrc.add(sample);
      report(sample.timestamp);
      sample.close();
    }
  }
  await writeVideoUntil(Infinity);
  report(total);
  await out.finalize();
  return writable ? null : new Blob([target.buffer], { type: "video/mp4" });
}

export async function audioDuration(file) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const t = await input.getPrimaryAudioTrack();
  return t ? t.computeDuration() : 0;
}
