import { NextRequest, NextResponse } from 'next/server';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

interface WeatherData {
  destination: string;
  current: {
    temperature: number;
    description: string;
    humidity: number;
    windSpeed: number;
    icon: string;
  };
  forecast: Array<{
    date: string;
    temperature: {
      min: number;
      max: number;
    };
    description: string;
    icon: string;
    precipitation: number;
  }>;
  packingRecommendations: string[];
  travelTips: string[];
}

interface OpenWeatherResponse {
  coord: { lat: number; lon: number };
  weather: Array<{ main: string; description: string; icon: string }>;
  main: { temp: number; humidity: number; temp_min: number; temp_max: number };
  wind?: { speed: number };
}

interface ForecastItem {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: Array<{ main: string; description: string; icon: string }>;
  pop?: number;
}

interface ForecastResponse {
  list: ForecastItem[];
}

async function getCoordinates(cityName: string): Promise<{ lat: number; lon: number } | null> {
  if (!OPENWEATHER_API_KEY) {
    console.log('OpenWeather API key not available');
    return null;
  }

  try {
    const response = await fetch(
      `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(cityName)}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      console.error('Failed to get coordinates for', cityName);
      return null;
    }
    
    const data = await response.json();
    return {
      lat: data.coord.lat,
      lon: data.coord.lon
    };
  } catch (error) {
    console.error('Error getting coordinates:', error);
    return null;
  }
}

async function getCurrentWeather(lat: number, lon: number): Promise<OpenWeatherResponse> {
  const response = await fetch(
    `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch current weather');
  }
  
  return response.json();
}

async function getForecast(lat: number, lon: number): Promise<ForecastResponse> {
  const response = await fetch(
    `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather forecast');
  }
  
  return response.json();
}

function generatePackingRecommendations(currentTemp: number, forecast: ForecastItem[]): string[] {
  const recommendations: string[] = [];
  const temps = forecast.map(f => f.main.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const hasRain = forecast.some(f => f.weather[0].main.toLowerCase().includes('rain'));
  
  
  if (maxTemp > 25) {
    recommendations.push('Light, breathable clothing');
    recommendations.push('Sunscreen and sunglasses');
    recommendations.push('Hat for sun protection');
  }
  
  if (minTemp < 15) {
    recommendations.push('Warm layers and jacket');
    recommendations.push('Long pants and closed shoes');
  }
  
  if (minTemp < 5) {
    recommendations.push('Heavy winter coat');
    recommendations.push('Warm accessories (gloves, scarf, hat)');
  }
  
  
  if (hasRain) {
    recommendations.push('Waterproof jacket or umbrella');
    recommendations.push('Water-resistant shoes');
  }
  
  
  recommendations.push('Comfortable walking shoes');
  recommendations.push('Layers for changing weather');
  
  return recommendations;
}

function generateTravelTips(currentWeather: OpenWeatherResponse, forecast: ForecastItem[]): string[] {
  const tips: string[] = [];
  const currentCondition = currentWeather.weather[0].main.toLowerCase();
  const hasRain = forecast.some(f => f.weather[0].main.toLowerCase().includes('rain'));
  const avgTemp = forecast.reduce((sum, f) => sum + f.main.temp, 0) / forecast.length;
  
  
  if (currentCondition.includes('rain')) {
    tips.push('Plan indoor activities for today');
    tips.push('Check attraction opening hours as some may close in bad weather');
  }
  
  if (hasRain) {
    tips.push('Book indoor attractions in advance as backup options');
    tips.push('Consider covered markets and museums for rainy days');
  }
  
  if (avgTemp > 30) {
    tips.push('Plan outdoor activities for early morning or evening');
    tips.push('Stay hydrated and take breaks in air-conditioned spaces');
  }
  
  if (avgTemp < 10) {
    tips.push('Many outdoor attractions may have limited hours');
    tips.push('Check if seasonal attractions are open');
  }
  
  
  tips.push('Check weather updates daily for any changes');
  tips.push('Download a local weather app for real-time updates');
  
  return tips;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination } = body;

    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    const weatherData = await getWeatherData(destination);
    
    if (!weatherData) {
      return NextResponse.json({ 
        error: 'Could not find weather data for this destination',
        fallback: {
          destination,
          message: 'Weather data unavailable for this location'
        }
      }, { status: 404 });
    }

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}


export async function getWeatherData(destination: string): Promise<WeatherData | null> {
  try {
    if (!OPENWEATHER_API_KEY) {
      console.log('OpenWeather API key not available');
      return null;
    }

    
    const coordinates = await getCoordinates(destination);
    if (!coordinates) {
      console.log('Could not find coordinates for', destination);
      return null;
    }

    
    const [currentWeather, forecastData] = await Promise.all([
      getCurrentWeather(coordinates.lat, coordinates.lon),
      getForecast(coordinates.lat, coordinates.lon)
    ]);

    
    const dailyForecast = [];
    const processedDates = new Set();
    
    for (const item of forecastData.list.slice(0, 40)) { 
      const date = new Date(item.dt * 1000).toDateString();
      
      if (!processedDates.has(date) && dailyForecast.length < 5) {
        processedDates.add(date);
        dailyForecast.push({
          date: new Date(item.dt * 1000).toLocaleDateString(),
          temperature: {
            min: Math.round(item.main.temp_min),
            max: Math.round(item.main.temp_max)
          },
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          precipitation: Math.round((item.pop || 0) * 100)
        });
      }
    }

    const weatherData: WeatherData = {
      destination,
      current: {
        temperature: Math.round(currentWeather.main.temp),
        description: currentWeather.weather[0].description,
        humidity: currentWeather.main.humidity,
        windSpeed: Math.round(currentWeather.wind?.speed || 0),
        icon: currentWeather.weather[0].icon
      },
      forecast: dailyForecast,
      packingRecommendations: generatePackingRecommendations(
        currentWeather.main.temp, 
        forecastData.list.slice(0, 40)
      ),
      travelTips: generateTravelTips(currentWeather, forecastData.list.slice(0, 40))
    };

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data for', destination, ':', error);
    return null;
  }
} 