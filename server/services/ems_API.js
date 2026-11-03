const express = require("express");
const { getInventory } = require("../controller/ems.controller");
const router = express.Router();

router.get("/inventory", getInventory);

module.exports = router;
