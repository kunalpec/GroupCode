import { spawn } from "child_process";

// Wraps a Docker CLI invocation so callers can await the command output.
// it open the shell -> run command -? wait -? end the shell ok 
const runDocker = (args) => {
  return new Promise((resolve, reject) => {
    const process = spawn("docker", args);

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => (stdout += data));
    process.stderr.on("data", (data) => (stderr += data));

    process.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr));
      resolve(stdout);
    });
  });
};

export { runDocker };
