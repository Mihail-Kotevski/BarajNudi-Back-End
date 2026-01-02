import express from "express";
const router = express.Router();
import Service from "../models/Services.js";

router.get("/", async (req, res) => {
  try {
    let services = await Service.find({});
    res.status(201).json({
      status: "Services hve been fetched succesfully.",
      services,
    });
  } catch (error) {
    res.status(500).send("Error fetching data!" + error.message);
  }
});

router.post("/createService", async (req, res) => {
  try {
    console.log(req.body);
    let service = new Service({
      title: req.body.title,
      description: req.body.description,
      image: req.body.image,
      phone: req.body.phone,
      location: req.body.location,
      typeOfService: req.body.typeOfService,
    });
    service = await service.save();
    res.status(201).json({
      status: "Service has been posted succesfully.",
      service,
    });
  } catch (error) {
    res.status(400).send("Error saving to database!" + error.message);
  }
});

router.put("/editService/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const updatedService = await Service.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: "Updated Succesfully",
      data: updatedService,
    });
  } catch (error) {
    res.status(404).message("update failed!" + error);
  }
});

router.delete("/deleteService/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let findService = await Service.findById(id);
    if (!findService) {
      res.status(404).message("Service not found");
    }
    const deleteService = await Service.findByIdAndDelete(id);
    res.status(200);
    if (!deleteService) {
      return res.status(404).send("Item not found");
    }
    res.status(200).json({ message: "Deleted successfully", deleteService });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;
