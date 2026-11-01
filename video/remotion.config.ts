import { Config } from "@remotion/cli/config";

// Lokales Chrome nutzen statt zusätzlichen Chrome-Headless-Shell-Download.
Config.setBrowserExecutable("C:/Program Files/Google/Chrome/Application/chrome.exe");
// Qualität: Frames als JPEG mit Qualität 100, H.264 mit niedriger CRF, normaler Wertebereich + bt709 (kein yuvj420p).
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(100);
Config.setCrf(14);
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setOverwriteOutput(true);
