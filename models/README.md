# Models

Real-ESRGAN (© Xintao Wang et al., BSD 3-Clause License, https://github.com/xinntao/Real-ESRGAN), converted from the
official PyTorch weights to ONNX for in-browser use with ONNX Runtime Web:

- `realesrgan-x4plus.onnx`: RealESRGAN_x4plus (RRDBNet, release v0.1.0). Most detail, heavy.
- `realesr-general-x4v3-dn03.onnx`: realesr-general-x4v3 blended with realesr-general-wdn-x4v3 at denoise strength 0.3
  (0.3·x4v3 + 0.7·wdn, as Real-ESRGAN's `-dn 0.3`). Fast, keeps more texture than plain x4v3.
