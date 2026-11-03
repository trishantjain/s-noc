import React from "react";
import { Card } from "./ui/card";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <Card className="flex items-center justify-center">
      <Link to="/inventory" className="mr-4">
        Inventory
      </Link>
      
      <Link to="/performance" className="mr-4">
        Performance
      </Link>
      
      <Link to="/battery-status" className="mr-4">
        Battery Status
      </Link>
    </Card>
  );
};

export default Navbar;
