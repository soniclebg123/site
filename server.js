const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const usersFile = "users.json";
let users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : {};

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/signup", async (req, res) => {
  const { pseudo, password, gender, avatar } = req.body;
  if (users[pseudo]) return res.status(400).send("Pseudo déjà utilisé");
  const hash = await bcrypt.hash(password, 10);
  users[pseudo] = { pseudo, hash, gender, avatar };
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  res.status(200).send("Inscription réussie");
});

app.post("/login", async (req, res) => {
  const { pseudo, password } = req.body;
  const user = users[pseudo];
  if (!user) return res.status(400).send("Utilisateur non trouvé");
  const match = await bcrypt.compare(password, user.hash);
  if (!match) return res.status(401).send("Mot de passe incorrect");
  res.status(200).json({ pseudo, gender: user.gender, avatar: user.avatar });
});

const onlineUsers = {};

io.on("connection", (socket) => {
  socket.on("join", (user) => {
    onlineUsers[socket.id] = user;
    io.emit("chat message", {
      pseudo: "System",
      text: `${user.pseudo} a rejoint le chat.`,
    });
  });

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    const user = onlineUsers[socket.id];
    if (user) {
      socket.broadcast.emit("chat message", {
        pseudo: "System",
        text: `${user.pseudo} a quitté le chat.`,
      });
      delete onlineUsers[socket.id];
    }
  });
});

http.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});