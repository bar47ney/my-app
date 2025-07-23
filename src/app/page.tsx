"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { VideoIcon } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
// import VideoThumbnail; // use npm published version


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
  const rangeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    handle: number
  ) => {
    e.preventDefault();
    setIsDraggig(handle);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging === null || !rangeRef.current) return;

      const rect = rangeRef.current.getBoundingClientRect();
      const pos = ((e.clientX - rect.left) / rect.width) * (max - min) + min;
      const newPos = Math.min(Math.max(pos, min), max);
      const snappedPos = Math.round(newPos / step) * step;

      const newRange: [number, number] = [...value];

      if (isDragging === 0) {
        newRange[0] = Math.min(snappedPos, value[1] - step);
      } else {
        newRange[1] = Math.max(snappedPos, value[0] - step);
      }

      onChange(newRange as [number, number]);
    };

    const handleMouseUp = () => {
      setIsDraggig(null);
    };

    if (isDragging !== null) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, max, min, onChange, step, value]);

  const leftPos = ((value[0] - min) / (max - min)) * 100;
  const rightPos = ((value[1] - min) / (max - min)) * 100;

  return (
    <div
      ref={rangeRef}
      className="relative h-12 bg-gray-700 rounded-lg cursor-pointer"
    >
      <div
        className="absolute h-full bg-red-700 rounded-lg"
        style={{ left: `${leftPos}%`, right: `${100 - rightPos}%` }}
      />
      <div
        className="absolute bg-white h-12 w-4 rounded-sm shadow cursor-grab active:cursor-grabbing"
        style={{ left: `${leftPos}%` }}
        onMouseDown={(e) => handleMouseDown(e, 0)}
      />
      <div
        className="absolute bg-white h-12 w-4 -ml-4 rounded-sm shadow cursor-grab active:cursor-grabbing"
        style={{ left: `${rightPos}%` }}
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
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      setStatus("loading ffmpeg...");
      setError(null);

      // const baseURL = "https://app.unpkg.com/@ffmpeg/ffmpeg@0.12.15/files/dist/umd";
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("log", ({ message }) => {
        console.log(message);
      });

      // await ffmpeg.load({
      //   coreURL: await toBlobURL(
      //     `${baseURL}/ffmpeg.js`,
      //     "text/javascript"
      //   ),
      //   wasmURL: await toBlobURL(
      //     `${baseURL}/ffmpeg-core.wasm`,
      //     "application/wasm"
      //   ),
      // });

      await ffmpeg.load();

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
      // generateThumbnails();
    }
  };

  const handleTrim = (newRange: [number, number]) => {
    setVideoState((prev) => ({ ...prev, trimRange: newRange }));
    if (videoRef.current) {
      videoRef.current.currentTime = newRange[0];
      setVideoState((prev) => ({ ...prev, currentTime: newRange[0] }));
    }
  };

  const handleLoadMetaData = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setVideoDuration(videoDuration);
      setVideoState({ ...videoState, trimRange: [0, videoDuration] });
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    if (videoRef.current) {
      setVideoState((prev) => ({
        ...prev,
        currentTime: videoRef.current?.currentTime || 0,
      }));
    }
  };

  // const generateThumbnails = async () => {
  //   try {
  //     if (!video) return;

  //     const ffmpeg = ffmpegRef.current;
  //     if (!ffmpeg) return;

  //     await ffmpeg.load();
  //     await ffmpeg.writeFile(video.name, await fetchFile(video));

  //     // Извлечение скриншотов (1 кадр в секунду)
  //     await ffmpeg.exec(["-i", video.name, "-vf", "fps=1", "output%d.png"]);

  //     const thumbnailUrls = [];
  //     const time = videoRef.current?.duration || 5;
  //     for (let i = 1; i <= time; i++) {
  //       const data = (await ffmpeg.readFile(`output${i}.png`)) as Uint8Array;
  //       const url = URL.createObjectURL(
  //         new Blob([data], { type: "image/png" })
  //       );
  //       thumbnailUrls.push(url);
  //     }

  //     setThumbnails(thumbnailUrls);
  //   } catch (error) {
  //     console.log(error);
  //     setError("Failed to thumbnails");
  //   }
  // };

  const handleExport = async () => {
    try {
      if (!video) return;

      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) return;

      await ffmpeg.writeFile(video.name, await fetchFile(video));

      const startTime = videoState.trimRange[0];
      const endTime = videoState.trimRange[1];
      const output = video.name.replace(/\.\w+$/, "-trimmed.mp4");

      await ffmpeg.exec([
        "-i",
        video.name,
        "-ss",
        startTime.toString(),
        "-to",
        endTime.toString(),
        "-c",
        "copy",
        output,
      ]);

      const data = (await ffmpeg.readFile(output)) as Uint8Array;
      const blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = output;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.log(error);
      setError("Failed to export video");
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
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadMetaData}
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
        <div className="bg-gray-800 flex flex-col space-y-4 text-white">
          <div>
            <button
              type="button"
              onClick={handleExport}
              className="bg-red-400 text-white px-4 py-2 rounded-md"
            >
              Export
            </button>
          </div>
          <div className="relative">
            <RangeSlider
              min={0}
              max={videoDuration}
              step={0.1}
              value={videoState.trimRange}
              onChange={handleTrim}
            />
            <div>
              {/* <VideoThumbnail
                videoUrl="https://dl.dropboxusercontent.com/s/7b21gtvsvicavoh/statue-of-admiral-yi-no-audio.mp4?dl=1"
                thumbnailHandler={(thumbnail) => console.log(thumbnail)}
                width={120}
                height={80}
              /> */}
              {/* {thumbnails.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt={`Thumbnail ${index + 1}`}
                  style={{ width: "100px", margin: "5px" }}
                />
              ))} */}
            </div>
            <div>
              <span>start {videoState.trimRange[0]}</span>
              <span>
                duration {videoState.trimRange[1] - videoState.trimRange[0]}
              </span>
              <span>end {videoState.trimRange[1]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
