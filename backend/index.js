const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const finalFileName = file.fieldname + "-" + uniqueSuffix + fileExtension;
    cb(null, finalFileName);
  },
});

const upload = multer({ storage });

app.use(express.static("public"));
app.use("/videos", express.static(path.join(__dirname, "public/uploads")));

app.post("/upload", upload.single("file"), (req, res) => {
  const { file } = req;

  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const totalChunks = parseInt(req.body["total-chunks"]);
  const currentChunk = parseInt(req.body["current-chunk"]);

  const chunkPath = path.join(
    __dirname,
    "public/uploads",
    `${file.originalname}.${currentChunk}`
  );

  const writeStream = fs.createWriteStream(chunkPath);
  req.pipe(writeStream);

  writeStream.on("error", (error) => {
    console.error("Error writing chunk:", error);
    res.status(500).json({ error: "Error writing chunk" });
  });

  writeStream.on("finish", () => {
    if (currentChunk === totalChunks) {
      const combinedFilePath = path.join(
        __dirname,
        "public/uploads",
        file.filename
      );

      const combinedWriteStream = fs.createWriteStream(combinedFilePath);

      let completedChunks = 0;

      const readChunks = () => {
        for (let i = 1; i <= totalChunks; i++) {
          const chunkPath = path.join(
            __dirname,
            "public/uploads",
            `${file.originalname}.${i}`
          );

          fs.access(chunkPath, fs.constants.F_OK, (err) => {
            if (err) {
              completedChunks++;
              checkAllChunksCompleted();
              return;
            }

            const chunkReadStream = fs.createReadStream(chunkPath);
            chunkReadStream.pipe(combinedWriteStream, { end: false });

            chunkReadStream.on("end", () => {
              completedChunks++;
              checkAllChunksCompleted();
            });

            chunkReadStream.on("error", (error) => {
              console.error("Error reading chunk:", error);
              res.status(500).json({ error: "Error reading chunk" });
            });
          });
        }
      };

      const checkAllChunksCompleted = () => {
        if (completedChunks === totalChunks) {
          combinedWriteStream.end();

          combinedWriteStream.on("finish", () => {
            const deletionPromises = [];

            for (let i = 1; i <= totalChunks; i++) {
              if (i !== currentChunk) {
                const chunkPath = path.join(
                  __dirname,
                  "public/uploads",
                  `${file.originalname}.${i}`
                );

                deletionPromises.push(
                  new Promise((resolve) => {
                    fs.unlink(chunkPath, (error) => {
                      if (error) {
                        console.error("Error deleting chunk:", error);
                      }
                      resolve();
                    });
                  })
                );
              }
            }

            Promise.all(deletionPromises)
              .then(() => {
                const videoUrl = `${req.protocol}://${req.get("host")}/videos/${
                  file.filename
                }`;
                res.json({ url: videoUrl });
              })
              .catch((error) => {
                console.error("Error deleting chunks:", error);
                res.status(500).json({ error: "Error deleting chunks" });
              });
          });
        }
      };

      readChunks();
    } else {
      res.json({ progress: (currentChunk / totalChunks) * 100 });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
