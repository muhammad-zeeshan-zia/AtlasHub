const Resource = require("../models/resource.model");

function parseCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

exports.submitResource = async (req, res) => {
  try {
  const { orgName, category } = req.body;

  if (!orgName || !category) {
      return res.status(400).json({
    message: "orgName and category are required."
      });
    }

    const sections = Array.isArray(req.body.sections)
      ? req.body.sections
          .map((section) => ({
            heading: section?.heading || "",
            contacts: Array.isArray(section?.contacts)
              ? section.contacts
                  .map((contact) => ({
                    method: contact?.method || "phone",
                    actionLabel: contact?.actionLabel || "Call",
                    value: contact?.value || "",
                    note: contact?.note || ""
                  }))
                  .filter((contact) => contact.value)
              : [],
            footerNote: section?.footerNote || ""
          }))
          .filter((section) => section.heading || section.contacts.length || section.footerNote)
      : [];

    const latRaw = parseCoordinate(req.body.latitude);
    const lngRaw = parseCoordinate(req.body.longitude);
    let latitude = null;
    let longitude = null;
    if (latRaw != null && lngRaw != null) {
      latitude = latRaw;
      longitude = lngRaw;
    } else if (latRaw != null || lngRaw != null) {
      return res.status(400).json({
        message: "Pick a full location on the map (both latitude and longitude), or clear the pin."
      });
    }

    const {
      submitterName: _submitterName,
      submitterEmail: _submitterEmail,
      submittedBy: _submittedBy,
      approvedBy: _approvedBy,
      approvedAt: _approvedAt,
      status: _status,
      ...safeBody
    } = req.body;

    const resource = await Resource.create({
      ...safeBody,
      keywords: req.body.keywords || req.body.orgName || "",
      contactAction: req.body.contactAction || "Call",
      contactNote: req.body.contactNote || "",
      sections,
      latitude,
      longitude,
      status: "pending"
    });

    return res.status(201).json({
      message: "Resource submitted. Waiting for admin approval.",
      resource
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit resource.", error: error.message });
  }
};

exports.getPendingResources = async (_req, res) => {
  try {
    const resources = await Resource.find({ status: "pending" })
      .sort({ createdAt: -1 });

    return res.json(resources);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch pending resources.", error: error.message });
  }
};

exports.approveResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    resource.status = "approved";
    resource.approvedBy = req.user.id;
    resource.approvedAt = new Date();
    await resource.save();

    return res.json({ message: "Resource approved successfully.", resource });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve resource.", error: error.message });
  }
};

exports.rejectResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    resource.status = "rejected";
    resource.approvedBy = req.user.id;
    resource.approvedAt = new Date();
    await resource.save();

    return res.json({ message: "Resource rejected successfully.", resource });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject resource.", error: error.message });
  }
};

exports.getApprovedResources = async (_req, res) => {
  try {
    const resources = await Resource.find({ status: "approved" }).sort({ createdAt: -1 });
    return res.json(resources);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch approved resources.", error: error.message });
  }
};

exports.getAllResources = async (req, res) => {
  try {
    const allowed = ["pending", "approved", "rejected"];
    const filter = {};
    const status = (req.query.status || "").toString().toLowerCase();
    if (status && status !== "all") {
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status filter." });
      }
      filter.status = status;
    }

    const resources = await Resource.find(filter)
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(resources);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch resources.", error: error.message });
  }
};

exports.setResourceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ["pending", "approved", "rejected"];
    const status = (req.body?.status || "").toString().toLowerCase();

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Status must be one of: pending, approved, rejected."
      });
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    resource.status = status;

    if (status === "pending") {
      resource.approvedBy = null;
      resource.approvedAt = null;
    } else {
      resource.approvedBy = req.user.id;
      resource.approvedAt = new Date();
    }

    await resource.save();

    return res.json({ message: `Resource marked as ${status}.`, resource });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update status.", error: error.message });
  }
};
