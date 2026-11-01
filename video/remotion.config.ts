import { Config } from "@remotion/cli/config";

// Lokales Chrome nutzen statt zusätzlichen Chrome-Headless-Shell-Download.
Config.setBrowserExecutable("C:/Program Files/Google/Chrome/Application/chrome.exe");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
