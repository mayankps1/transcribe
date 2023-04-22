const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const axios = require("axios");
// Import OpenAI correctly


const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const YoutubeMp3Downloader = require('youtube-mp3-downloader');
const ffmpeg = require('fluent-ffmpeg');

dotenv.config();

// Initialize OpenAI configuration
const openai = process.env.OPENAI_API_KEY;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from Mayank!',
  });
});

// Get videoId from front end user
app.post('/', async (req, res) => {
  try {
    const videoId = req.body.prompt;
    console.log(videoId);

    // Download audio of YouTube video with given ID
    const downloadAudio = async () => {
      return new Promise((resolve, reject) => {
        try {
          // Instantiate YoutubeMp3Downloader object inside try block
          const YD = new YoutubeMp3Downloader({
            ffmpegPath: ffmpegPath, // Pass path to ffmpeg executable as a string
            outputPath: './audio',
            youtubeVideoQuality: 'highestaudio',
            requestOptions: { // Add User-Agent header to request options object to fix MinigetError issue
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
              }
            }
          });

          // Add listener for "finished" event to rename downloaded file to "audio.mp3"
          YD.on('finished', (err, data) => {
            if (err) {
              console.error(err);
              reject(err);
            }

            fs.rename(
              data.file,
              path.join(__dirname, 'audio', 'audio.mp3'),
              (err) => {
                if (err) {
                  console.error(err);
                  reject(err);
                }

                resolve(data);
              }
            );
          });

          YD.on('error', (error) => {
            console.error(error);
            reject(error);
          });

          YD.on('progress', (progress) => {
            console.log(`Download progress: ${progress.percent}`);
          });

          // Start downloading audio
          YD.download(videoId); // Replace hardcoded video ID with the one received from front end user
        } catch (error) {
          console.error(error);
          reject(error);
        }
      });
    };

    const model = "whisper-1";
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const filePath = path.join(__dirname, "audio", "audio.mp3");
    const outputFilePath = path.join(__dirname, "transcription.txt");

    (async () => {
      try {
        await downloadAudio();

        // Set up the OpenAI audio transcription API request
        const formData = new FormData();
        
        formData.append("Content-Type", "multipart/form-data");
        formData.append("model", model);
        formData.append("file", fs.createReadStream(filePath));

        const headers = {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        };

          // Send the audio file to the OpenAI API for transcription
    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, { headers });

    console.log( response.data );
    res.status(200).send({
      bot: response.data.text
    });

        // Save the transcribed text to a file
        fs.writeFile(outputFilePath, response.data.text, "utf8", (err) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log(`Transcribed text saved to ${outputFilePath}`);
        });
      } catch (error) {
        console.error(error);
      }
    })();

  } catch (error) {
    console.error(error);
  }

});

app.listen(5000, () =>
  console.log('AI server started on http://localhost:5000')
);

