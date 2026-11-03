const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "/.env"),
});

async function getInventory(req, res) {
  try {
    console.log("Running inventory api");
    const result = await fetch(process.env.InventoryAPI);
    const data = await result.json();


    console.log(data);
    // res.send(200).json({
    //   sucess: true,
    //   ...result,
    // });
  } catch (error) {
    console.error("Battery Backup Alarm API Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch battery backup alarms",
    });
  }
}

module.exports = { getInventory };
