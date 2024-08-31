const Session = require('../models/session');
const pendingUsers = {};

const isSessionValid = async (telegramUserId) => {
  try {
    const session = await Session.findOne({ telegramUserId });
    console.log(`Checking session for user ID: ${telegramUserId}`);
    if (!session) {
      console.log('No session found.');
      return false;
    }
    const isValid = session.expiresAt > new Date();
    console.log(`Session found: ${session}`);
    console.log(`Is session valid? ${isValid}`);
    return isValid;
  } catch (error) {
    console.error('Error retrieving session:', error);
    return false;  // If there's an error, treat it as an invalid session
  }
};

const generateOrderInstruction = () => {
  return `
*Instrucciones para realizar un pedido:*

Para la cocina, envía:
\`Ordenar X de Y, Z de W\`

Para la barra, envía:
\`Bebida X de Y, Z de W\`

- *X* y *Z* son las cantidades.
- *Y* y *W* son los nombres de los platos o bebidas.

Por ejemplo:
\`Ordenar 1 de Boneless, 2 de Arepas\` para cocina
\`Bebida 1 de Mojito, 2 de Margarita\` para barra

También puedes hacer múltiples pedidos en el mismo mensaje, separándolos por comas.
`;
};

const handlePinEntry = async (chatId, pin, bot) => {
  if (/^\d{6}$/.test(pin)) {
    console.log(`Valid PIN entered: ${pin}`);
    pendingUsers[chatId].step = 'awaitingAlias';
    pendingUsers[chatId].pin = pin;
    bot.sendMessage(chatId, '✅ PIN validado. Por favor ingresa tu nombre de usuario:');
  } else {
    console.log('Invalid PIN entered');
    bot.sendMessage(chatId, '⚠️ PIN inválido. Debe ser un número de 6 dígitos.');
  }
};

const handleAliasEntry = async (chatId, alias, bot) => {
  try {
    // Find the session by PIN and update it with the telegramUserId and alias
    const session = await Session.findOneAndUpdate(
      { pin: pendingUsers[chatId].pin, telegramUserId: null },  // Ensure the session is unassigned
      {
        telegramUserId: chatId,
        alias: alias,
        expiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000) // 10 hours from now
      },
      { new: true }  // Return the updated document
    );

    if (!session) {
      bot.sendMessage(chatId, '⚠️ Error: PIN no válido o ya asignado. Intenta de nuevo.');
      return;
    }

    console.log(`Session updated for user: ${alias}`);
    bot.sendMessage(chatId, `🎉 Bienvenido, ${alias}! Ahora puedes realizar pedidos. ${generateOrderInstruction()}`);
    
    // Clean up the pendingUsers state
    delete pendingUsers[chatId];
  } catch (error) {
    console.error('Error updating session:', error);
    bot.sendMessage(chatId, '⚠️ Error al guardar la sesión. Intenta de nuevo.');
  }
};


module.exports = {
  isSessionValid,
  pendingUsers,
  handlePinEntry,
  handleAliasEntry,
  generateOrderInstruction
};
