export function parseQuotedArgs(input) {
  const args = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = null;
      if (current) {
        args.push(current);
        current = '';
      }
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}

export async function safeReply(message, content) {
  try {
    const reply = await message.reply(content);
    return reply;
  } catch (error) {
    try {
      const msg = await message.channel.send(content);
      return msg;
    } catch (sendError) {
      console.error('Failed to send message:', sendError);
      return null;
    }
  }
}
