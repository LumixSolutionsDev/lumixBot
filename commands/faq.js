import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("faq")
    .setDescription("Displays the Lumix FAQ Embed.");

export async function execute(interaction) {
    const embed = new EmbedBuilder()
        .setColor(16731212)
        .setTitle("<:Lumix:1454282504444837970> F.A.Q (Frequently Asked Questions)")
        .setDescription(
            "**Before opening a ticket, please look through the questions below.**\n" +
            "You may find the answer you’re looking for here.\n\n" +
            "This section provides important information about our services, hosting features, and available resources for both **Discord bots** and **Teamspeak servers**."
        )
        .setFields(
            {
                name: "**How fast does my service go online after purchase?**",
                value:
                    "Services typically go online within **5–10 minutes** after purchase, unless uncommon issues occur during the setup process.",
                inline: false,
            },
            {
                name: "**What types of services do you support?**",
                value:
                    "We offer hosting for:\n" +
                    "- **Discord bots** (all major libraries: Discord.js, Eris, discord.py, nextcord, etc.)\n" +
                    "- **Teamspeak servers**, fully managed and ready to configure\n\n" +
                    "*If your project requires something else, reach out — we can discuss custom solutions.*",
                inline: false,
            },
            {
                name: "**How do I upload my bot or configure my Teamspeak server?**",
                value:
                    "For Discord bots, you can upload through our panel using **File Manager** or **SFTP**.\n" +
                    "For Teamspeak, configuration is done through our web panel, where you can manage permissions, channels, and settings easily.",
                inline: false,
            },
            {
                name: "**How do I install packages or plugins?**",
                value:
                    "Packages for bots or plugins for Teamspeak are handled automatically:\n\n" +
                    "**Node.js bots:** Add packages to your `package.json` → the system runs `npm install` on startup.\n" +
                    "**Python bots:** Add dependencies to `requirements.txt` → `pip install -r requirements.txt` is run automatically.\n" +
                    "**Teamspeak plugins:** Upload via panel → they are installed and activated automatically.",
                inline: false,
            },
            {
                name: "**Are resources dedicated or shared?**",
                value:
                    "Resources are allocated per-service. Each bot or Teamspeak server gets its own RAM and storage. Higher-tier plans offer increased resources for demanding projects.",
                inline: false,
            },
            {
                name: "**Are my files private from other customers?**",
                value:
                    "Yes. Every service runs in its own **isolated container**, keeping your files fully private and separated from all other customers.",
                inline: false,
            },
            {
                name: "**Do you offer migration help from another host?**",
                value:
                    "Absolutely! Our support team can help transfer your bot or Teamspeak server, verify everything works correctly, and ensure a smooth, error-free transition.",
                inline: false,
            },
            {
                name: "**Do you provide hosted databases?**",
                value:
                    "We support **MySQL** by default, included in every plan. Use it to store bot data safely. For Teamspeak, database features are managed internally for server settings.",
                inline: false,
            },
            {
                name: "**What is your uptime guarantee?**",
                value:
                    "We guarantee **99.9% uptime**, backed by enterprise-grade hardware and industry-leading **DDoS protection** for both bots and Teamspeak servers.",
                inline: false,
            }
        );

    if (interaction.channel) {
        await interaction.channel.send({ embeds: [embed] });
    }

    await interaction.reply({ content: "FAQ posted!", ephemeral: true });
}
