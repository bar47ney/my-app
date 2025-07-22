"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { VideoIcon } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";

interface VideoPlayerState {
  isPlaying: boolean;
  trimRange: [number, number];
  video: string | null;
  currentTime: number;
}

export default function Home() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoState, setVideoState] = useState<VideoPlayerState>({
    isPlaying: false,
    trimRange: [0, 0],
    video: null,
    currentTime: 0,
  });

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      setStatus("loading ffmpeg...");
      setError(null);

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.15/dist/umd";
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("log", ({ message }) => {
        console.log(message);
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      setStatus("idle");
    } catch (error) {
      console.log(error);
      setError("Failed to load FFmpeg");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) setError("No selected file");
    if (file) {
      const url = URL.createObjectURL(file);
      setVideo(file);
      setVideoState({ ...videoState, video: url });
    }
  };

  return (
    <div className="h-screen w-full max-w-4xl mx-auto">
      <div className="grid grid-rows-[1fr_auto] h-full">
        <div className="bg-gray-900 w-full h-full relative overflow-hidden">
          {videoState.video ? (
            <div className="absolute inset-0">
              <video
                ref={videoRef}
                src={videoState.video}
                controls
                className="w-full h-full object-contain inset-0 flex items-center justify-center"
              ></video>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center p-8">
              <div className="flex flex-col items-center justify-center border border-dashed border-white/25 px-6 py-10">
                <div>
                  <VideoIcon className="mx-auto h-12 w-12 text-gray-400" />
                </div>
                <div className="flex items-center justify-center text-sm leading-6 text-gray-400">
                  <label className="relative cursor-pointer rounded-md bg-gray-900 font-semibold text-white">
                    <span>Upload video </span>
                    <input
                      type="file"
                      accept="video/*"
                      id="file-upload"
                      name="file-upload"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                <p className="text-xs leading-5 text-gray-400 mt-2">
                  MP4, MOV and AVI upto 100MB
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-gray-800 flex flex-col space-y-4">x</div>
      </div>
    </div>
  );
}
