import { useEffect, useState } from "react";
import { fetchWeatherApi } from "openmeteo";
import { addHours, format, isAfter, isBefore } from "date-fns";
import axios from "axios";
import { Link, Element } from "react-scroll";
import { GoogleGenAI } from "@google/genai";
import "./App.css";
import ReactMarkdown from "react-markdown";

function App() {
  //set default coordinates of elche
  const [inputVal, setInputVal] = useState("");
  const [location, setLocation] = useState([]);
  const [city, setCity] = useState("Elche");
  const [country, setCountry] = useState("Spain");
  const [latitude, setLatitude] = useState(38.2622);
  const [longitude, setLongitude] = useState(-0.7011);
  const [isFetched, setIsFetched] = useState(false);
  const [temp, setTemp] = useState("20");
  const [time, setTime] = useState("");
  const [precipitation, setPrecipitation] = useState("");
  const [humidity, setHumidity] = useState("");
  const [wind, setWind] = useState("");
  const [apparentTemp, setApparentTemp] = useState("");
  const [dailyDate, setDailyDate] = useState([]);
  const [dailyMax, setDailyMax] = useState(0);
  const [dailyMin, setDailyMin] = useState(0);
  const [hourlyTemp, setHourlyTemp] = useState([]);
  const [askAi, setAskAi] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  //const [fetchAiData, setFetchAiData] = useState(false);

  /*navigator.geolocation.getCurrentPosition((position) => {
    setLatitude(position.coords.latitude);
    setLongitude(position.coords.longitude);
  });*/

  let images = [
    "icon-rain.webp",
    "icon-drizzle.webp",
    "icon-sunny.webp",
    "icon-partly-cloudy.webp",
    "icon-storm.webp",
    "icon-snow.webp",
    "icon-fog.webp",
  ];

  let currentHour = new Date().getHours();

  const hours = [];

  for (let i = 1; i < 7; i++) {
    if (currentHour >= 24) {
      currentHour = 0;
    }

    hours.push(currentHour);
    currentHour++;
  }

  const handleChange = (event) => {
    setInputVal(event.target.value);
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        let res = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search?name=${inputVal}&count=3&language=en&format=json`
        );
        setLocation(res.data.results);
      } catch (error) {
        console.error(error);
        setLocation(null);
      }
    };

    //debouncing
    let timeout = setTimeout(() => {
      if (inputVal === "") return;
      fetchLocation();
    }, 350);

    return () => clearTimeout(timeout);
  }, [inputVal]);

  const url = "https://api.open-meteo.com/v1/forecast";

  useEffect(() => {
    const params = {
      latitude: `${latitude}`,
      longitude: `${longitude}`,
      hourly: "temperature_2m",
      daily: ["temperature_2m_max", "temperature_2m_min"],
      current: [
        "temperature_2m",
        "precipitation",
        "relative_humidity_2m",
        "wind_speed_10m",
        "apparent_temperature",
      ],
      timezone: "auto",
    };

    const fetchData = async () => {
      const responses = await fetchWeatherApi(url, params);
      const res = responses[0];

      // const timezoneAbbreviation = res.timezoneAbbreviation();
      const utcOffsetSeconds = res.utcOffsetSeconds();

      const current = res.current();
      const hourly = res.hourly();
      const daily = res.daily();

      // Note: The order of weather variables in the URL query and the indices below need to match!
      const weatherData = {
        current: {
          time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
          temperature_2m: current.variables(0).value(),
          precipitation: current.variables(1).value(),
          relative_humidity_2m: current.variables(2).value(),
          wind_speed_10m: current.variables(3).value(),
          apparent_temperature: current.variables(4).value(),
        },
        hourly: {
          time: Array.from(
            {
              length:
                (Number(hourly.timeEnd()) - Number(hourly.time())) /
                hourly.interval(),
            },
            (_, i) =>
              new Date(
                (Number(hourly.time()) +
                  i * hourly.interval() +
                  utcOffsetSeconds) *
                  1000
              )
          ),
          temperature_2m: hourly.variables(0).valuesArray(),
        },
        daily: {
          time: Array.from(
            {
              length:
                (Number(daily.timeEnd()) - Number(daily.time())) /
                daily.interval(),
            },
            (_, i) =>
              new Date(
                (Number(daily.time()) +
                  i * daily.interval() +
                  utcOffsetSeconds) *
                  1000
              )
          ),
          temperature_2m_max: daily.variables(0).valuesArray(),
          temperature_2m_min: daily.variables(1).valuesArray(),
        },
      };

      setIsFetched(true);
      setTime(String(weatherData.current.time));
      setTemp(weatherData.current.temperature_2m);
      setPrecipitation(weatherData.current.precipitation);
      setHumidity(weatherData.current.relative_humidity_2m);
      setWind(weatherData.current.wind_speed_10m);
      setApparentTemp(weatherData.current.apparent_temperature);
      // The 'weatherData' object now contains a simple structure, with arrays of datetimes and weather information

      const interval = weatherData.hourly.time
        .map((date, index) => {
          const sevenHoursFromNow = addHours(new Date(), 7);
          const temperature = weatherData.hourly.temperature_2m[index];

          if (isAfter(date, new Date()) && isBefore(date, sevenHoursFromNow)) {
            return {
              date: date,
              formattedDate: format(date, "H aa"),
              temp: temperature,
              formattedTemp: temperature.toFixed(0),
            };
          }

          return null;
        })
        .filter((date) => date !== null);

      setDailyDate(weatherData.daily.time);
      setDailyMax(weatherData.daily.temperature_2m_max);
      setDailyMin(weatherData.daily.temperature_2m_min);
      setHourlyTemp(interval);
    };

    fetchData();
    //initally will fetch default weather of elche
  }, [latitude, longitude]);

  let date = time.slice(0, 15);

  const prompt = `What type of clothes would you recommend to wear if weather in ${city} is ${Math.floor(
    temp
  )} degrees celcius with humidity at ${humidity}percent, wind speed of ${Math.floor(
    wind
  )} kilometers per hour, and precipitation of ${precipitation} millimeters? Provide a brief explanation for your recommendation.`;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const ai = new GoogleGenAI({
    apiKey: `${apiKey}`,
  });

  async function askGemini() {
    try {
      setAskAi(true);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${prompt}`,
        config: {
          systemInstruction: "You are a weather forecaster",
        },
      });
      setAiResponse(response.text);
    } catch (error) {
      console.error("Error generating content:", error);
    }
  }

  return (
    <>
      <div className="nav">
        <div className="logo">
          <img src="/images/logo.svg" alt="logo" />
        </div>

        <div className="units">
          <div>
            <img src="/images/gemini.png" alt="ai-icon" />
          </div>
          <Link to="ai" smooth={true} duration={500}>
            <span className="what-to-wear">What to wear?</span>
          </Link>
        </div>
      </div>

      <h1>How's the sky looking today?</h1>

      <div className="search">
        <input
          type="text"
          placeholder="Search for a place"
          onChange={handleChange}
        />

        <div className="search-results">
          {location ? (
            location.map((places) => (
              <p
                key={places.id}
                onClick={() => {
                  setLatitude(places.latitude);
                  setLongitude(places.longitude);
                  setCity(places.name);
                  setCountry(places.country);
                }}
              >
                {places.name}, {places.country}
              </p>
            ))
          ) : (
            <p>No search results found!</p>
          )}
        </div>
      </div>

      <div className="wrapper">
        <div className="today">
          <h2>
            {city}, {country}
          </h2>
          <p>{isFetched && date}</p>

          <div className="forecast-wrapper">
            <div className="img-div">
              <img src="/images/icon-sunny.webp" alt="" />
            </div>

            <h3>{Math.floor(temp)}°</h3>
          </div>
        </div>

        <div className="weather-info-container">
          <div>
            {isFetched && (
              <div>
                <p>Feels like</p>
                <p className="digit">{Math.floor(apparentTemp)}°</p>
              </div>
            )}
          </div>

          <div>
            {isFetched && (
              <div>
                <p>Humidity</p>
                <p className="digit">{humidity} %</p>
              </div>
            )}
          </div>

          <div>
            {isFetched && (
              <div>
                <p>Wind</p>
                <p className="digit">{Math.floor(wind)} Km/h</p>
              </div>
            )}
          </div>

          <div>
            {isFetched && (
              <div>
                <p>Precipitation</p>
                <p className="digit">{Number(precipitation).toFixed(2)} mm</p>
              </div>
            )}
          </div>
        </div>

        <div className="daily-forecast-container">
          <h2>Daily forecast</h2>
          <div className="days">
            {isFetched &&
              dailyDate.map((day, i) => (
                <div className="day" key={i}>
                  <p>{String(day).slice(0, 3)}</p>

                  {/*using i to render different images*/}
                  <div className="icon-div">
                    <img src={`/images/${images[i]}`} alt="icon" />
                  </div>

                  <div className="max-min">
                    <div>{Math.floor(dailyMax[i])}°</div>
                    <div>{Math.floor(dailyMin[i])}°</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="hourly-forecast-container">
          <div className="hour-day">
            <h2>Hourly forecast</h2>
          </div>

          {isFetched &&
            hourlyTemp.map((hour, i) => (
              <div className="hour" key={i}>
                <div className="icon-div">
                  <img src={`/images/${images[i]}`} alt="icon" />
                </div>

                <p>{hour.formattedDate}</p>
                <p className="temp">{hour.formattedTemp} °</p>
              </div>
            ))}
        </div>
      </div>

      <div className="ai">
        <h2>
          Want to know what to wear?{" "}
          <span className="ask-gemini" onClick={() => askGemini()}>
            Ask Gemini
          </span>
        </h2>

        {askAi && (
          <div className="response">
            <ReactMarkdown>{aiResponse || "Thinking..."}</ReactMarkdown>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
