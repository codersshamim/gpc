// Run from the project root: node scripts/reset-admin.js
// This safely creates/updates .env directly; the password is not echoed.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const bcrypt = require("bcryptjs");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (typeof input.setRawMode !== "function") {
      reject(new Error("Please run this command in Windows Command Prompt or PowerShell, not an editor terminal that does not support hidden input."));
      return;
    }
    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    process.stdout.write(question);
    let value = "";
    const onKey = (str, key) => {
      if (key && (key.name === "return" || key.name === "enter")) {
        input.setRawMode(false);
        input.pause();
        input.removeListener("keypress", onKey);
        process.stdout.write("\n");
        resolve(value);
      } else if (key && key.ctrl && key.name === "c") {
        input.setRawMode(false);
        input.pause();
        input.removeListener("keypress", onKey);
        reject(new Error("Cancelled."));
      } else if (key && key.name === "backspace") {
        value = value.slice(0, -1);
      } else if (str && !key?.ctrl && str.length === 1) {
        value += str;
      }
    };
    input.on("keypress", onKey);
  });
}

(async () => {
  try {
    const username = (await ask("Admin username [admin]: ")) || "admin";
    if (!/^[A-Za-z0-9._-]{1,40}$/.test(username)) {
      throw new Error("Username may contain only letters, numbers, dot, underscore or hyphen (max 40 characters).");
    }
    const password = await askHidden("New admin password (hidden): ");
    if (Buffer.byteLength(password, "utf8") < 12) {
      throw new Error("Password must be at least 12 bytes/characters. Run the command again.");
    }
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new Error("For bcrypt compatibility, use a password no longer than 72 UTF-8 bytes.");
    }

    const hash = await bcrypt.hash(password, 12);
    const secret = crypto.randomBytes(48).toString("hex");
    const contents = [
      `ADMIN_USERNAME=${username}`,
      `ADMIN_PASSWORD_HASH=${hash}`,
      `SESSION_SECRET=${secret}`,
      "NODE_ENV=development",
      ""
    ].join("\n");

    if (fs.existsSync(envPath)) {
      const backupPath = path.join(root, `.env.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);
      fs.copyFileSync(envPath, backupPath);
      console.log(`Previous .env backed up as ${path.basename(backupPath)}`);
    }
    fs.writeFileSync(envPath, contents, { encoding: "utf8", mode: 0o600 });
    console.log("\nAdmin credentials saved successfully to the .env file.");
    console.log(`Username: ${username}`);
    console.log("Password: saved (not displayed)");
    console.log("\nNow stop the server with Ctrl+C, then run: npm start");
    console.log("Log in at http://localhost:3000/admin");
  } catch (err) {
    console.error(`\nSetup failed: ${err.message}`);
    process.exitCode = 1;
  }
})();
