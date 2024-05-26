const Order = require('../models/order');
const Inventory = require('../models/inventory');
const io = require('../server'); // Import the io object

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('items.itemId');
    res.status(200).json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { items, createdBy, numberOfPeople } = req.body;
    
    // Validate and update inventory
    const inventoryUpdates = [];
    for (const item of items) {
      const inventoryItem = await Inventory.findById(item.itemId);
      if (!inventoryItem || inventoryItem.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient quantity for item ${item.name}` });
      }
      inventoryItem.quantity -= item.quantity;
      inventoryUpdates.push(inventoryItem.save());
    }

    // Save inventory updates
    await Promise.all(inventoryUpdates);

    const totalPrice = items.reduce((total, item) => total + (item.quantity * item.sellPrice), 0);

    const newOrder = new Order({
      items,
      totalPrice,
      status: 'Pending',
      createdBy,
      numberOfPeople,
      statusChangedAt: Date.now()
    });

    await newOrder.save();
    io.emit('orderCreated', newOrder); // Emit event
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.status) {
      updateData.statusChangedAt = Date.now();
    }

    // Update inventory if items have changed
    if (updateData.items) {
      const order = await Order.findById(id);
      const inventoryUpdates = [];

      // Revert inventory for old items
      for (const item of order.items) {
        const inventoryItem = await Inventory.findById(item.itemId);
        inventoryItem.quantity += item.quantity;
        inventoryUpdates.push(inventoryItem.save());
      }

      // Validate and update inventory for new items
      for (const item of updateData.items) {
        const inventoryItem = await Inventory.findById(item.itemId);
        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          return res.status(400).json({ error: `Insufficient quantity for item ${item.name}` });
        }
        inventoryItem.quantity -= item.quantity;
        inventoryUpdates.push(inventoryItem.save());
      }

      // Save inventory updates
      await Promise.all(inventoryUpdates);
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true });
    io.emit('orderUpdated', updatedOrder); // Emit event
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
