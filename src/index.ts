import express from "express";
import simpleGit, { SimpleGit } from "simple-git";
import path from "path";
import fs from "fs";
import recursiveReaddir from "recursive-readdir";
import cors from "cors"; // Import cors

const app = express();
const port = 3000;
const git: SimpleGit = simpleGit();

app.use(express.json());
app.use(cors());

const repoPath = "repositories/chewiedb";

app.post("/write", async (req, res) => {
  const { filename, content, commitMessage, projectId } = req.body;

  if (!filename || !content || !commitMessage || !projectId) {
    return res.status(400).send("Filename, projectId, content and commit message are required");
  }

  const filePath = path.join(repoPath + "/" + projectId, filename);

  try {
    // Write folder
    if (!fs.existsSync(repoPath + "/" + projectId)) {
      fs.mkdirSync(repoPath + "/" + projectId);
      console.log(`Directory created at ${repoPath + "/" + projectId}`);
    }
    // Write file
    fs.writeFileSync(filePath, content);

    // Add file to git
    await git.cwd(repoPath).add(projectId);
    await git.commit(commitMessage);
    await git.push();

    res.status(200).send("File written and changes pushed to Git repository");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error writing file or pushing to Git repository");
  }
});

app.post("/files", async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).send("projectId is required");
    }
    // Pull latest changes from the repository
    await git.cwd(repoPath).pull();

    // Read all files from the repository
    recursiveReaddir(repoPath + "/" + projectId, (err, files) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error reading files from the repository");
      }

      // Read file contents
      const fileContents = files.map((file) => ({
        path: file.replace(/\\/g, "/").replace(repoPath + "/" + projectId + "/", ""),
        content: fs.readFileSync(file, "utf-8"),
      }));

      res.status(200).json(fileContents);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error pulling from Git repository");
  }
});

const cloneRepo = async () => {
  if (!fs.existsSync(repoPath)) {
    await git.clone("https://github.com/fabiensabatie/chewie-db.git", repoPath);
  }
};

// Clone the repository on server start if not already cloned
cloneRepo()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Error cloning repository:", error);
  });
