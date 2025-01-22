import {
  Action,
  ActionExample,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
  generateText,
  composeContext,
} from "@elizaos/core";

export const emojiDecisionTemplate = `# Message Content
{{recentMessages}}


# Instructions: Based on the message content above or in the room, decide on the most appropriate emoji reaction. React to the message with the emoji only and no additional text. Pick an emoji that conveys sentiment, meaning, or intent from the message. Use emojis like 🤖 (AI-related), 😂 (funny), ❤️ (love), 👎 (negative sentiment), 🆘 (help-related), or others that match the context.
`;

const dynamicEmojiAction = {
  name: "REACT_TO_MESSAGES_DYNAMIC",
  similes: [
    "ADD_DYNAMIC_REACTION",
    "MESSAGE_DYNAMIC_REACTION",
    "AI_EMOJI_RESPONSE",
    "REACT_DYNAMICALLY",
  ],
  description: "Dynamically reacts to messages with emojis using AI to decide.",
  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State) => {
    // Only trigger for Discord messages
    return message.content.source === "discord";
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback
  ) => {
    const callbackData: Content = {
      text: "", // No text response needed for this action
      action: "REACT_TO_MESSAGES_DYNAMIC_RESPONSE",
      source: message.content.source,
      attachments: [],
    };

    const discordClient = runtime.clients["discord"]; // Get the Discord.js client
    if (!discordClient) {
      console.error("Discord client not initialized.");
      return;
    }
    const { roomId, content } = message;
    console.log("roomId (channel ID):", roomId);
    console.log("message.id (Discord message ID):", message.id);

    // Use AI model to determine the appropriate emoji
    // Create the context string
    const contextString = composeContext({
      state,
      template: emojiDecisionTemplate,
    });

    const response = await generateText({
      runtime,
      context: contextString,
      modelClass: ModelClass.SMALL, // Use a small model for quick decisions
    });

    console.log("AI Model Response:", response);
    const emoji = response.trim();
    if (!emoji || !/^(\p{Emoji}|\p{Emoji_Presentation})$/u.test(emoji)) {
      console.warn("Invalid emoji response:", emoji);
      return; // Skip invalid responses
    }

    try {
      // Fetch the Discord channel using the roomId (treated as channel ID in this context)
      const channel = await discordClient.channels.fetch(roomId);
      if (!channel?.isTextBased()) {
        console.error("Channel is not text-based.");
        return;
      }

      // Fetch the message using the roomId and memory ID
      const discordMessage = await channel.messages.fetch(message.id);
      if (!discordMessage) {
        console.error("Message not found.");
        return;
      }

      console.log("roomId (channel ID):222", roomId);
      console.log("message.id (Discord message ID):222", message.id);
      // React to the message with the dynamically selected emoji
      await discordMessage.react(emoji);
      console.log(`Reacted to message "${content.text}" with ${emoji}`);
    } catch (error) {
      console.error("Failed to react to message:", error);
    }

    return callbackData; // Return the callback data to indicate completion.
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "AI is the future of technology!",
          action: "REACT_TO_MESSAGES_DYNAMIC",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "REACT_TO_MESSAGES_DYNAMIC",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you help me with this?",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "REACT_TO_MESSAGES_DYNAMIC",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;

export default dynamicEmojiAction;
