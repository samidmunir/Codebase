"use server";

import connectDB from "../mongodb";
import { Event } from "@/database";

export const getSimilarEventsBySlug = async (slug: string) => {
  try {
    await connectDB();

    const event = await Event.findOne({ slug });
    const similarEvents = await Event.find({
      _id: { $ne: event._id },
      tags: { $in: event.tags },
    }).lean();

    console.log("similarEvents:", similarEvents);

    return similarEvents;
  } catch (e) {
    return [];
  }
};
