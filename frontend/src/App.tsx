/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import Dropzone, { DropzoneState } from "react-dropzone";
import axios, { AxiosResponse } from "axios";
import { Line } from "rc-progress";

const ONE_MB_SIZE = 1048576;

const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<any | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    const handleUploadProgress = (progressEvent: any) => {
      if (progressEvent.lengthComputable) {
        const progress = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100
        );

        setUploadProgress(progress);
      }
    };

    const uploadFile = async (file: File) => {
      const chunkSize = 10 * ONE_MB_SIZE; // 10 MB chunk size
      const totalChunks = Math.ceil(file.size / chunkSize);

      const uploadPromises: Promise<AxiosResponse<any>>[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(file.size, (i + 1) * chunkSize);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("file", chunk, file.name);
        formData.append("total-chunks", String(totalChunks));
        formData.append("current-chunk", String(i + 1));

        const config = {
          headers: {
            "Content-Type": "multipart/form-data",
            "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
          },
          onUploadProgress: handleUploadProgress,
        };

        const uploadPromise = axios
          .post("http://localhost:3000/upload", formData, config)
          .then((response) => {
            console.log("Chunk upload response:", response.data);
            return response;
          })
          .catch((error) => {
            console.error("Error uploading chunk:", error);
            throw error;
          });

        uploadPromises.push(uploadPromise);
      }

      try {
        await Promise.all(uploadPromises);
        setUploadProgress(100);
        console.log(file);
        setUploadedFile(file);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    };

    if (uploadedFile) {
      uploadFile(uploadedFile);
    }
  }, [uploadedFile]);

  const handleFileUpload = (files: File[]) => {
    const file = files[0];
    setUploadedFile(file);
  };

  const handleLinkClick = () => {
    if (uploadedFile) {
      if (uploadedFile.url) {
        window.open(uploadedFile.url);
      } else if (uploadedFile.preview) {
        window.open(uploadedFile.preview);
      }
    }
  };

  return (
    <>
      <div
        style={{
          width: "30%",
          display: "flex !important",
          marginLeft: "30%",
          marginTop: "4%",
          padding: "1%",
        }}
      >
        <Dropzone
          onDrop={handleFileUpload}
          accept={{
            "image/png": [".png"],
            "image/jpg": [".jpg"],
            "image/jpeg": [".jpeg"],
            "video/mp4": [".mp4"],
            "video/mtk": [".mtk"],
            "audio/mpeg": [".mp3"],
            "video/quicktime": [".mov"],
            "video/x-msvideo": [".avi"],
          }}
          multiple={false}
          maxSize={100000000}
        >
          {({ getRootProps, getInputProps }: DropzoneState) => (
            <div
              {...getRootProps()}
              style={{
                height: "200px",
                border: "2px dashed gray",
                padding: "2%",
                color: "gray",
                cursor: "pointer",
              }}
            >
              <input {...getInputProps()} />
              <p>Add a video here (max size: 100MB)</p>
            </div>
          )}
        </Dropzone>
        {uploadedFile && (
          <div style={{ marginTop: ".2rem" }}>
            <Line
              percent={uploadProgress}
              strokeWidth={6}
              strokeColor={uploadProgress === 100 ? "#323c7a" : "#2db7f5"}
              trailWidth={3}
              trailColor="#ccc"
            />

            <button
              onClick={handleLinkClick}
              style={{
                backgroundColor: "gray",
                color: "white",
                padding: "20px",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              Watch Online
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default App;
