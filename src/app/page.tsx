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

type RangeSliderProps = {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
};

const RangeSlider = ({ min, max, step, value, onChange }: RangeSliderProps) => {
  const [isDragging, setIsDraggig] = useState<number | null>(null);
  const rangeRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    handle: number
  ) => {
    e.preventDefault();
    setIsDraggig(handle);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !rangeRef.current) return;

      const rect = rangeRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const newValue = min + percent * (max - min);

      const newValueRounded = Math.round(newValue / step) * step;

      if (isDragging === 0) {
        onChange([newValueRounded, value[1]]);
      } else {
        onChange([value[0], newValueRounded]);
      }
    };
  }, [isDragging, max, min, onChange, step, value]);

  return (
    <div
      ref={rangeRef}
      className="relative h-12 bg-gray-700 rounded-lg cursor-pointer"
    >
      <div className="absolute inset-0 h-full bg-red-700 rounded-lg"></div>
      <div
        className="absolute left-0 bg-white h-12 w-4 rounded-sm shadow cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => handleMouseDown(e, 0)}
      />
      <div
        className="absolute right-0 bg-white h-12 w-4 rounded-sm shadow cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => handleMouseDown(e, 1)}
      />
    </div>
  );
};

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
    // loadFFmpeg();
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

  const handleTrim = async () => {};

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
        <div className="bg-gray-800 flex flex-col space-y-4">
          <div className="relative">
            <RangeSlider
              min={0}
              max={100}
              step={0.1}
              value={videoState.trimRange}
              onChange={handleTrim}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
