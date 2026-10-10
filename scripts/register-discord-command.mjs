const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!applicationId || !botToken) {
  throw new Error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in your shell before registering the command.");
}

const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify([
    {
      name: "squad",
      description: "Overwatch 플레이어의 OW-Score와 코칭 요약을 조회합니다",
      options: [
        {
          type: 3,
          name: "battletag",
          description: "배틀태그 (예: Player#1234)",
          required: true,
          min_length: 5,
          max_length: 64,
        },
      ],
    },
  ]),
});

if (!response.ok) {
  const message = await response.text();
  throw new Error(`Discord command registration failed (${response.status}): ${message}`);
}

console.log("Registered the /squad command.");
