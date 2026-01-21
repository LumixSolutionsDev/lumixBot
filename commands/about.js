import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Displays the Lumix About Embed.");

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(16731212)
    .setTitle("<:Lumix:1454282504444837970> About Lumix Solutions")
    .setDescription("Lumix Solutions was founded in **December 2025** by **Hoot** and **Corgi** with the goal of providing reliable, well-managed hosting services built on consistency, transparency, and technical care. From the beginning, our focus has been on creating infrastructure that clients can depend on, supported by systems and processes designed for long-term stability.\nWe currently specialize in **Discord Bot Hosting** and **TeamSpeak Hosting**, delivering solutions that prioritize performance, uptime, and ease of management. Our services are supported by active monitoring, structured support workflows, and a commitment to resolving issues efficiently and professionally.\n\nLooking ahead, Lumix Solutions is actively preparing to expand into additional services and infrastructure offerings as demand grows. Every expansion is approached carefully, with the intent to maintain the same standards of quality, security, and reliability that define our existing services.\n\nOur mission is to build lasting partnerships with our clients by providing hosting solutions that are dependable today and scalable for the future. We appreciate your trust in Lumix Solutions and look forward to growing together.");

  if (interaction.channel) {
    await interaction.channel.send({ embeds: [embed] });
  }

  await interaction.reply({ content: "About posted!", ephemeral: true });
}
