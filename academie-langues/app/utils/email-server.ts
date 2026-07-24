import tls from "tls";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function encodeAddress(address: string) {
  const fromName = process.env.GMAIL_FROM_NAME || "NEXA";
  return `${encodeHeader(fromName)} <${address}>`;
}

function dotStuff(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function createMessage({ to, subject, text }: EmailPayload, from: string) {
  const encodedBody = Buffer.from(text, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  return [
    `From: ${encodeAddress(from)}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodedBody,
  ].join("\r\n");
}

function waitForResponse(socket: tls.TLSSocket) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && /^\d{3} /.test(last)) {
        socket.off("data", onData);
        const code = Number(last.slice(0, 3));
        if (code >= 400) reject(new Error(buffer));
        else resolve(buffer);
      }
    };
    socket.on("data", onData);
  });
}

async function command(socket: tls.TLSSocket, value: string) {
  socket.write(`${value}\r\n`);
  return waitForResponse(socket);
}

export async function sendEmail(payload: EmailPayload) {
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;

  if (!user || !password || !payload.to) {
    return { sent: false, skipped: true };
  }

  const socket = tls.connect({
    host: "smtp.gmail.com",
    port: 465,
    servername: "smtp.gmail.com",
  });

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
      socket.setTimeout(15000, () => reject(new Error("SMTP timeout")));
    });

    await waitForResponse(socket);
    await command(socket, "EHLO iag-academy.com");
    await command(socket, "AUTH LOGIN");
    await command(socket, Buffer.from(user).toString("base64"));
    await command(socket, Buffer.from(password).toString("base64"));
    await command(socket, `MAIL FROM:<${user}>`);
    await command(socket, `RCPT TO:<${payload.to}>`);
    await command(socket, "DATA");
    socket.write(`${dotStuff(createMessage(payload, user))}\r\n.\r\n`);
    await waitForResponse(socket);
    await command(socket, "QUIT");
    return { sent: true, skipped: false };
  } catch (error) {
    console.error("Gmail SMTP error:", error);
    return { sent: false, skipped: false };
  } finally {
    socket.destroy();
  }
}

export async function sendEmails(messages: EmailPayload[]) {
  const results = await Promise.allSettled(messages.map((message) => sendEmail(message)));
  return {
    sent: results.filter((result) => result.status === "fulfilled" && result.value.sent).length,
    total: messages.length,
  };
}
