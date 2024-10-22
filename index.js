require('dotenv').config();
const { createKey, readKey, updateKey, deleteKey } = require('./redisClient');
const tempRes = require('./tempRes.json');  // Adjust the path as needed

const port = process.env.PORT || 3000;

const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Import the cors package

const OpenAI = require('openai');
const bodyParser = require('body-parser');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

const apiKey = process.env.PLACE_API;

async function fetchPlacesImage(placeName) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
      params: {
        input: placeName,
        inputtype: 'textquery',
        fields: 'photos,place_id',
        key: apiKey
      }
    });

    if (response.data.candidates.length > 0) {
      const placeId = response.data.candidates[0].place_id;
      const photoReference = response?.data?.candidates[0]?.photos[0]?.photo_reference || "image comming soon";

      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;

      return photoUrl;
    } else {
      console.log('No candidates found for the place');
      return 'No photo available';
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
}

async function createItinerary(userInput) {
  const {
    msg,
    location,
    diningOptions,
    length,
    interests,
    travelers,
    budget,
    accommodationOptions,
    season,
    transportation,
    isDisable,
    startDate,
    endDate,
  } = userInput;

  const prompt = `
    Create a highly personalized itinerary for the following trip, considering user preferences and past behaviors: 
    Destination: ${msg}, 
    Location: ${location}, 
    StartDate: ${startDate},
    EndDate: ${endDate},
    Dining Options: ${diningOptions} with specific restaurant names, their special dishes tailored to the traveler's tastes, and price details for ${travelers} people, 
    Length: ${length} days, 
    Interests: ${interests}, with a focus on off-the-beaten-path experiences, local culture, and hidden gems, 
    Travelers: ${travelers}, 
    Budget: ${budget}, 
    Accommodation Options: ${accommodationOptions} with specific hotel names, their website links, image links, average price for ${travelers} people, and unique features (e.g., boutique or eco-friendly stays), 
    Season: ${season}, 
    Transportation: ${transportation}, optimized for comfort and accessibility. 
    Ensure dynamic, real-time insights into local events, weather, or festivals happening during the trip. 
    The response should be in JSON format and include daily activities with time slots (e.g., from 12:00 PM to 2:00 PM), unique recommendations (e.g., secret viewpoints, guided local experiences), locations formatted as [Location, Country], and price details for both activities and dining. 
    Additionally, suggest necessary items for specific activities (e.g., a tent for hiking, sunscreen for beach days). 
    The itinerary should focus on personalized, immersive, and engaging experiences that inspire exploration. 
    Ensure the JSON follows the fixed structure:
    {
      "success": true,
      "itinerary": {
        "trip": {
          "destination": "string",
          "length": "string",
          "budget": "string",
          "season": "string",
          "transportation": "string",
          "travelers": "number",
          "interests": ["string"],
          "itinerary": {
            "dayX": {
              "date": "string", 
              "accommodation": {
                "name": "string",
                "website": "string",
                "image": "string",
                "unique_features": "string", // e.g., "Boutique hotel with rooftop pool"
                "couple_friendly": "boolean",
                "time": "string",
                "wheelChairAccessible": "boolean",
                "price": "string",    // e.g., "Rs. 1500 for 2 people"
              },
              "activities": [
                {
                  "time": "string", 
                  "activity": "string", 
                  "image": "string",
                  "price": "string",    e.g., "Rs. 500 for 2 people"
                  "insider_tip": "string", // e.g., "Best visited at sunset for stunning views"
                }
              ],
              "location": "string",
              "dining_options": [
                {
                  "name": "string",
                  "specialty_dish": "string",
                  "image": "string",
                  "price": "string",    e.g., "Rs. 1000 for 2 people"
                  "opensAt": "string",              // e.g., "9:00 AM"
                  "closesAt": "string",             // e.g., "10:00 PM"
                  "timeSpend": "string",            // e.g., "2:00 PM - 3:00 PM"
                  "wheelChairAccessible": "boolean",
                  "dining_type": "Breakfast|Lunch|Dinner",
                  "local_event_insight": "string"  // e.g., "Live music every Thursday night"
                }
              ],
              "distance_to_next_day": "string" // e.g., "50 Km to next day's destination"
            }
          }
        }
      }
      "total_accommodation_price": "string",   // e.g., "Rs. 1500 for 2 people"
      "total_activity_price": "string", // e.g., "Rs. 150 for 2 people"
      "total_dining_price": "string",  // e.g., "Rs. 500 for 2 people"
      "total_price": "string",  //  e.g., "Rs. 2000" (sum of hotel, activity, and dining prices)
      "necessary_items": [
        {
          "name": "string", // e.g., "Sunscreen"
          "description": "string" // e.g., "Sunscreen for beach days"
          "image": "string"    // e.g., "Beach days" 
        }
      ]
    }`;


  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const generatedItinerary = JSON.parse(response.choices[0].message.content);

    if (!generatedItinerary.success || !generatedItinerary.itinerary?.trip) {
      throw new Error("Invalid itinerary structure received from AI");
    }

    return generatedItinerary;
  } catch (error) {
    console.error("Error creating itinerary:", error);
    return {
      success: false,
      message: "Failed to generate itinerary",
    };
  }
}

app.post("/redis", async (req, res) => {
  try {

    await createKey(req.body.location, JSON.stringify(tempRes))
    const val = await readKey(req.body.location)

    res.status(200).json(JSON.parse(val));

  } catch (e) {
    console.log(e)
  }


})
app.post("/generate-itinerary", async (req, res) => {
  try {

    const val = await readKey(req.body.location)

    if (val?.length > 0) {
      return res.status(200).json(JSON.parse(val));
    }

    const userInput = req.body;
    const result = await createItinerary(userInput);


    if (result?.success) {
      const accommodationOptions = result?.itinerary?.trip?.itinerary;

      for (const day in accommodationOptions) {
        const accommodation = accommodationOptions[day].accommodation;
        if (accommodation.image) {
          const placeName = `${accommodation.name}, ${accommodationOptions[day].location}`;
          const photoUrl = await fetchPlacesImage(placeName);
          accommodation.image = photoUrl;
        }

        const activities = accommodationOptions[day].activities;
        for (const act of activities) {
          if (act.image) {
            const activityName = `${act.activity}`;
            const actPhotoUrl = await fetchPlacesImage(activityName);
            act.image = actPhotoUrl;
          }
        }

        const diningOptions = accommodationOptions[day].dining_options;
        for (const diningOption of diningOptions) {
          if (diningOption.image) {
            const restaurantName = `${diningOption.name}, ${accommodationOptions[day].location}`;
            const restaurantPhotoUrl = await fetchPlacesImage(restaurantName);
            diningOption.image = restaurantPhotoUrl;
          }
        }

        const necessaryItems = result?.necessary_items;
        for (const item of necessaryItems) {
          if (item?.image) {
            const itemName = `${item.name}`;
            const itemPhotoUrl = await fetchPlacesImage(itemName);
            item.image = itemPhotoUrl;
          }
        }
      }


      return res.status(200).json(result);
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to generate itinerary" });
    }
  } catch (error) {
    console.log("Error in itinerary generation", error);
    return res.status(500).json({ success: false, message: "Error occurred", error });
  }
});