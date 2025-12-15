import { useEffect, useState } from "react";
import { fetchWeatherApi } from "openmeteo";
import axios from "axios";
import "./App.css";

function App() {
  //const [data, setData] = useState();
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
  const [hourlyTime, setHourlyTime] = useState([]);
  const [hourlyTemp, setHourlyTemp] = useState([]);

  let images = [
    "icon-rain.webp",
    "icon-drizzle.webp",
    "icon-sunny.webp",
    "icon-partly-cloudy.webp",
    "icon-storm.webp",
    "icon-snow.webp",
    "icon-fog.webp",
  ];

  const handleChange = (event) => {
    setInputVal(event.target.value);
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        let res = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search?name=${inputVal}&count=3&language=en&format=json`
        );
        console.log(res.data.results);
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
    }, 2000);

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

      console.log(responses);
      //setData(responses);

      // Attributes for timezone and location
      const latitude = res.latitude();
      const longitude = res.longitude();
      const elevation = res.elevation();
      const timezone = res.timezone();
      const timezoneAbbreviation = res.timezoneAbbreviation();
      const utcOffsetSeconds = res.utcOffsetSeconds();

      console.log(
        `\nCoordinates: ${latitude}°N ${longitude}°E`,
        `\nElevation: ${elevation}m asl`,
        `\nTimezone: ${timezone} ${timezoneAbbreviation}`,
        `\nTimezone difference to GMT+0: ${utcOffsetSeconds}s`
      );

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

      console.log(weatherData);
      setIsFetched(true);
      setTime(String(weatherData.current.time));
      setTemp(weatherData.current.temperature_2m);
      setPrecipitation(weatherData.current.precipitation);
      setHumidity(weatherData.current.relative_humidity_2m);
      setWind(weatherData.current.wind_speed_10m);
      setApparentTemp(weatherData.current.apparent_temperature);

      // The 'weatherData' object now contains a simple structure, with arrays of datetimes and weather information

      console.log(
        `\nCurrent time: ${weatherData.current.time}\n`,
        `\nCurrent temperature_2m: ${weatherData.current.temperature_2m}`,
        `\nCurrent precipitation: ${weatherData.current.precipitation}`,
        `\nCurrent relative_humidity_2m: ${weatherData.current.relative_humidity_2m}`,
        `\nCurrent wind_speed_10m: ${weatherData.current.wind_speed_10m}`,
        `\nCurrent apparent_temperature: ${weatherData.current.apparent_temperature}`
      );

      console.log("\nDaily data:\n", weatherData.daily);
      console.log(weatherData.daily.time);
      setDailyDate(weatherData.daily.time);
      setDailyMax(weatherData.daily.temperature_2m_max);
      setDailyMin(weatherData.daily.temperature_2m_min);
      setHourlyTime(weatherData.hourly.time);
      console.log(
        `\nCurrent time: ${weatherData.current.time}\n`,
        weatherData.current.weather_code
      );
      console.log("\nHourly data:\n", weatherData.hourly);
    };

    fetchData();
    //initally will fetch default weather of elche
  }, [latitude, longitude]);

  let date = time.slice(0, 15);
  //to only show dd/mm/yyyy format

  return (
    <>
      <div className="nav">
        <div className="logo">
          <img src="../public/images/logo.svg" alt="logo" />
        </div>

        <div className="units">
          <div>
            <img src="../public/images/icon-units.svg" alt="units-icon" />
          </div>
          <p>Units</p>
          <div>
            <img src="../public/images/icon-dropdown.svg" alt="dropdown-icon" />
          </div>
        </div>
      </div>

      <h1>How's the sky looking today?</h1>

      <div className="search">
        <input
          type="text"
          placeholder="Search for a place"
          onChange={handleChange}
        />
        <button>Search</button>
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

      <div className="today">
        <h2>
          {city}, {country}
        </h2>
        <p>{isFetched && date}</p>

        <div className="forecast-wrapper">
          <div className="img-div">
            <img src="../public/images/icon-sunny.webp" alt="" />
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
              <p className="digit">{Math.floor(precipitation)} mm</p>
            </div>
          )}
        </div>
      </div>

      <h2>Daily forecast</h2>

      <div className="daily-forecast-container">
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
                  <div>{Math.ceil(dailyMax[i])}°</div>
                  <div>{Math.floor(dailyMin[i])}°</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="hourly-forecast-container">
        <div className="hour-day">
          <h2>Hourly forecast</h2>

          <div>
            Day
            <img src="../public/images/icon-dropdown.svg" alt="dropdown-icon" />
          </div>
        </div>

        {/*isFetched &&
          hourlyTime.map((hour, i) => (
            <div className="hour" key={i}>
              <div className="icon-div">
                <img src={`/images/${images[i]}`} alt="icon" />
              </div>

              <p>{hour}</p>
            </div>
          ))*/}
      </div>
    </>
  );
}

export default App;
