import { Booking } from '../models/Booking.js';
import Joi from 'joi';

const createSchema = Joi.object({
  roomNumber: Joi.string().trim().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  purpose: Joi.string().trim(),
  bookedBy: Joi.string().hex().length(24).optional()
});

const updateSchema = Joi.object({
  roomNumber: Joi.string().trim(),
  startDate: Joi.date(),
  endDate: Joi.date(),
  purpose: Joi.string().trim(),
  bookedBy: Joi.string().hex().length(24).optional()
});

// TODO: per README.md section 4, you will need a way to detect whether a
// proposed booking conflicts with an existing one on the same room.

// GET /api/bookings
// TODO: implement per README.md section 3.
export async function getAllBookings(req, res, next) {
  try {
     const bookings = await Booking.find()
      .populate('bookedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) { next(err); }
}

// GET /api/bookings/:id
// TODO: implement per README.md sections 3 and 5.
export async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('bookedBy', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ booking });
  } catch (err) { next(err); }
}

async function findConflict({ roomNumber, startDate, endDate, excludeId }) {
  const query = {
    roomNumber,
    startDate: { $lt: endDate },
    endDate: { $gt: startDate }
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return Booking.findOne(query);
}

// POST /api/bookings
// TODO: implement per README.md sections 3 and 4.
export async function createBooking(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (value.startDate >= value.endDate) {
      return res.status(400).json({
        message: 'startDate must be before endDate'
      });
    }

    const conflict = await findConflict({
      roomNumber: value.roomNumber,
      startDate: value.startDate,
      endDate: value.endDate
    });

    if (conflict) {
      return res.status(409).json({
        message: 'This room is already booked during that time'
      });
    }

    const booking = await Booking.create(value);

    res.status(201).json({ booking });
  } catch (err) { next(err); }
}

// PATCH /api/bookings/:id
// TODO: implement per README.md sections 3, 4, and 5.
export async function updateBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const { value, error } = updateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const roomNumber = value.roomNumber ?? booking.roomNumber;
    const startDate = value.startDate ?? booking.startDate;
    const endDate = value.endDate ?? booking.endDate;

    if (startDate >= endDate) {
      return res.status(400).json({
        message: 'startDate must be before endDate'
      });
    }

    const conflict = await findConflict({
      roomNumber,
      startDate,
      endDate,
      excludeId: booking._id
    });

    if (conflict) {
      return res.status(409).json({
        message: 'This room is already booked during that time'
      });
    }

    Object.assign(booking, value);
    await booking.save();
    await booking.populate('bookedBy', 'name email');

    res.json({ booking });
  } catch (err) { next(err); }
}

// DELETE /api/bookings/:id
// TODO: implement per README.md sections 3 and 5.
export async function deleteBooking(req, res, next) {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
}