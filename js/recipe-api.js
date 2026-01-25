// Recipe API Service - Spoonacular Integration

const RecipeAPI = {
  cache: new Map(),
  isLoading: false,
  currentOffset: 0,
  hasMore: true,
  
  // Build API URL with parameters
  buildUrl(endpoint, params = {}) {
    const config = window.API_CONFIG;
    const url = new URL(config.BASE_URL + endpoint);
    
    // Add API key
    url.searchParams.append('apiKey', config.API_KEY);
    
    // Add other parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    return url.toString();
  },
  
  // Search recipes from API
  async searchRecipes(query, offset = 0) {
    const cacheKey = `search_${query}_${offset}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('Returning cached results for:', query);
      return this.cache.get(cacheKey);
    }
    
    this.isLoading = true;
    
    try {
      const config = window.API_CONFIG;
      
      // For Indian dishes, add cuisine parameter
      const isIndianQuery = this.isIndianDish(query);
      const params = {
        query: query,
        number: config.DEFAULT_PARAMS.number,
        offset: offset,
        addRecipeInformation: true,
        fillIngredients: false,
        instructionsRequired: true,
        sort: 'popularity'
      };
      
      // Add cuisine filter for Indian dishes
      if (isIndianQuery) {
        params.cuisine = 'indian';
      }
      
      const url = this.buildUrl(config.ENDPOINTS.SEARCH, params);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API recipes to our format
      const recipes = data.results.map(recipe => this.transformRecipe(recipe));
      
      // Cache results
      this.cache.set(cacheKey, recipes);
      
      // Update pagination
      this.hasMore = data.results.length === config.DEFAULT_PARAMS.number;
      
      console.log(`Found ${recipes.length} recipes from API`);
      return recipes;
      
    } catch (error) {
      console.error('API search error:', error);
      return [];
    } finally {
      this.isLoading = false;
    }
  },
  
  // Check if query is for Indian dish
  isIndianDish(query) {
    const indianKeywords = [
      'pani puri', 'panipuri', 'golgappa',
      'gulab jamun', 'gulabjamun',
      'samosa', 'pakora', 'tikka',
      'biryani', 'curry', 'masala',
      'naan', 'roti', 'paratha',
      'dosa', 'idli', 'vada',
      'chaat', 'bhel', 'sev',
      'ladoo', 'barfi', 'halwa',
      'tandoori', 'korma', 'vindaloo',
      'dal', 'paneer', 'butter chicken'
    ];
    
    const lowerQuery = query.toLowerCase();
    return indianKeywords.some(keyword => lowerQuery.includes(keyword));
  },
  
  // Get detailed recipe information
  async getRecipeDetails(recipeId) {
    const cacheKey = `recipe_${recipeId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const config = window.API_CONFIG;
      const endpoint = config.ENDPOINTS.RECIPE_INFO.replace('{id}', recipeId);
      const url = this.buildUrl(endpoint, {
        includeNutrition: false
      });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const recipe = await response.json();
      const transformed = this.transformRecipe(recipe);
      
      this.cache.set(cacheKey, transformed);
      return transformed;
      
    } catch (error) {
      console.error('Error fetching recipe details:', error);
      return null;
    }
  },
  
  // Transform Spoonacular recipe to our format
  transformRecipe(apiRecipe) {
    // Determine difficulty based on time and complexity
    let difficulty = 'easy';
    const time = apiRecipe.readyInMinutes || 30;
    
    if (time > 60 || (apiRecipe.analyzedInstructions?.[0]?.steps?.length || 0) > 10) {
      difficulty = 'hard';
    } else if (time > 30 || (apiRecipe.analyzedInstructions?.[0]?.steps?.length || 0) > 6) {
      difficulty = 'medium';
    }
    
    // Extract steps from instructions
    let steps = [];
    if (apiRecipe.analyzedInstructions && apiRecipe.analyzedInstructions.length > 0) {
      steps = apiRecipe.analyzedInstructions[0].steps.map(step => step.step);
    } else if (apiRecipe.instructions) {
      // Fallback: split instructions by periods or newlines
      steps = apiRecipe.instructions
        .split(/\.|[\r\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
    }
    
    // If no steps, create a placeholder
    if (steps.length === 0) {
      steps = ['View full recipe instructions on the source website.'];
    }
    
    return {
      id: apiRecipe.id,
      title: apiRecipe.title,
      time: `${time} mins`,
      difficulty: difficulty,
      category: this.extractCategory(apiRecipe),
      image: apiRecipe.image || 'https://via.placeholder.com/312x231?text=Recipe',
      steps: steps,
      sourceUrl: apiRecipe.sourceUrl || apiRecipe.spoonacularSourceUrl,
      servings: apiRecipe.servings || 4,
      isFromAPI: true // Flag to identify API recipes
    };
  },
  
  // Extract category from dish types or cuisines
  extractCategory(apiRecipe) {
    if (apiRecipe.cuisines && apiRecipe.cuisines.length > 0) {
      return apiRecipe.cuisines[0];
    }
    if (apiRecipe.dishTypes && apiRecipe.dishTypes.length > 0) {
      return apiRecipe.dishTypes[0].charAt(0).toUpperCase() + apiRecipe.dishTypes[0].slice(1);
    }
    return 'Other';
  },
  
  // Get random recipes
  async getRandomRecipes(count = 10) {
    try {
      const config = window.API_CONFIG;
      const url = this.buildUrl(config.ENDPOINTS.RANDOM, {
        number: count
      });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.recipes.map(recipe => this.transformRecipe(recipe));
      
    } catch (error) {
      console.error('Error fetching random recipes:', error);
      return [];
    }
  },
  
  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('API cache cleared');
  }
};

// Export globally
window.RecipeAPI = RecipeAPI;

console.log('Recipe API service initialized');