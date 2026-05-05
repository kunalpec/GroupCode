import { runDocker } from "../util/docker.util.js";
import { ApiError } from "../util/ApiError.util.js";
import { asyncHandler } from "../util/asyncHandler.util.js";
import { ApiResponse } from "../util/ApiResponse.util.js";

const buildServices = (ports, host) => ({
  react: {
    label: "React",
    containerPort: 5173,
    hostPort: ports.react,
    url: `http://${host}:${ports.react}`,
  },
  backend: {
    label: "Backend",
    containerPort: 8000,
    hostPort: ports.backend,
    url: `http://${host}:${ports.backend}`,
  },
  python: {
    label: "Python",
    containerPort: 5000,
    hostPort: ports.python,
    url: `http://${host}:${ports.python}`,
  },
  socket: {
    label: "Socket",
    containerPort: 6000,
    hostPort: ports.socket,
    url: `ws://${host}:${ports.socket}`,
  },
  next: {
    label: "Next.js",
    containerPort: 3000,
    hostPort: ports.next,
    url: `http://${host}:${ports.next}`,
  },
});

const createUserContainer = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");

  const userId = `user_${user._id}`;
  const host = req.hostname || "localhost";
  const generatePort = (base) => base + Math.floor(Math.random() * 1000);

  const ports = {
    react: generatePort(5173),
    backend: generatePort(8000),
    python: generatePort(5000),
    socket: generatePort(6000),
    next: generatePort(3000),
  };

  const volumeName = `vol_${userId}`;

  try {
    const containerId = await runDocker([
      "run",
      "-dit",
      "--name",
      userId,
      "--memory=512m",
      "--cpus=0.5",
      "--pids-limit=100",
      "--security-opt=no-new-privileges",
      "--network=bridge",
      "-v",
      `${volumeName}:/home/user`,
      "-p",
      `${ports.react}:5173`,
      "-p",
      `${ports.backend}:8000`,
      "-p",
      `${ports.python}:5000`,
      "-p",
      `${ports.socket}:6000`,
      "-p",
      `${ports.next}:3000`,
      "user_sandbox_image",
    ]);

    const services = buildServices(ports, host);

    user.containerId = containerId;
    user.containerServices = services;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
      new ApiResponse(200, "Container created successfully", {
        containerId,
        name: userId,
        volume: volumeName,
        ReactPort: { ports: 5173, react: ports.react },
        backendPort: { port: 8000, node: ports.backend },
        pythonPort: { port: 5000, flask: ports.python },
        socketPort: { port: 6000, websocket: ports.socket },
        nextPort: { port: 3000, nextjs: ports.next },
        services,
      }),
    );
  } catch (error) {
    if (error.message.includes("already in use")) {
      throw new ApiError(409, "Container already exists");
    }

    throw new ApiError(500, error.message || "Docker failed");
  }
});

const getContainerInfo = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");
  if (!user.containerId) throw new ApiError(404, "Container not found");

  const host = req.hostname || "localhost";
  const savedServices = user.containerServices || {};

  const services = Object.fromEntries(
    Object.entries(savedServices).map(([key, service]) => [
      key,
      {
        ...service,
        url:
          service?.containerPort === 6000
            ? `ws://${host}:${service.hostPort}`
            : `http://${host}:${service.hostPort}`,
      },
    ]),
  );

  return res.status(200).json(
    new ApiResponse(200, "Container info fetched", {
      containerId: user.containerId,
      services,
    }),
  );
});

const startUserContainer = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");

  const userId = `user_${user._id}`;

  try {
    const containerId = await runDocker(["start", userId]);
    return res
      .status(200)
      .json(new ApiResponse(200, "Container started successfully", { containerId }));
  } catch (error) {
    if (error.message.includes("No such container")) {
      throw new ApiError(404, "Container not found");
    }

    throw new ApiError(500, error.message || "Failed to start container");
  }
});

const stopUserContainer = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");

  const userId = `user_${user._id}`;

  try {
    const containerId = await runDocker(["stop", userId]);
    return res
      .status(200)
      .json(new ApiResponse(200, "Container stopped successfully", { containerId }));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to stop container");
  }
});

const getContainerStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");

  const userId = `user_${user._id}`;

  try {
    const status = await runDocker(["inspect", "-f", "{{.State.Status}}", userId]);
    return res
      .status(200)
      .json(new ApiResponse(200, "Container status fetched", { status }));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to fetch status");
  }
});

export const containerController = {
  createUserContainer,
  getContainerInfo,
  startUserContainer,
  stopUserContainer,
  getContainerStatus,
};
