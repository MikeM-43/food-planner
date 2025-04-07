// Define the SheetDB URL
const SHEETDB_URL = 'https://sheetdb.io/api/v1/uuj8ranlqzt8f';

let meals = [];
let selectedMeals = new Set();

// Define shopping list categories
const shoppingCategories = {
  produce: 'Produce, Fruits & Vegetables',
  meat: 'Meat & Protein',
  dairy: 'Dairy, Eggs & Cheese',
  spices: 'Spices & Seasonings',
  pantry: 'Pantry Staples',
  frozen: 'Frozen Foods',
  bakery: 'Bakery & Bread',
  other: 'Other Items'
};

// Load meals data
async function loadMeals() {
  try {
    console.log('Attempting to fetch meals from SheetDB...');
    const response = await fetch(SHEETDB_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from SheetDB: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Raw API response:', data);
    
    // Transform the data
    meals = data.map(meal => {
      console.log('Processing meal:', meal);
      const recipeText = meal['recipie '] || meal.recipie || '';
      const ingredients = meal.ingredients || '';
      console.log('Ingredients for', meal.name, ':', ingredients);
      
      return {
        ...meal,
        recipie: recipeText.trim(),
        ingredients: ingredients.trim(),
        instructions: recipeText ? recipeText.split(/\d+\./).filter(step => step.trim()).map(step => step.trim()) : []
      };
    });
    
    console.log('Processed meals data:', meals);
    
    // After loading meals, populate filters and display meals
    if (meals.length > 0) {
      populateFilters();
      displayRandomMeals();
    } else {
      console.error('No meals data loaded');
    }
    
  } catch (error) {
    console.error("Failed to load meals from SheetDB:", error);
    console.log("Attempting to load from local meals.json...");
    
    try {
      const localResponse = await fetch('meals.json');
      if (!localResponse.ok) {
        throw new Error('Local meals.json response was not ok');
      }
      meals = await localResponse.json();
      console.log('Loaded meals from local file:', meals);
      
      if (meals.length > 0) {
        populateFilters();
        displayRandomMeals();
      }
    } catch (localError) {
      console.error("Failed to load meals from both sources:", localError);
      meals = [];
    }
  }
}

// Populate filter dropdowns
function populateFilters() {
  const mainIngredientSelect = document.getElementById('mainIngredient');
  const goalSelect = document.getElementById('goal');
  
  // Get unique values - handling both mainIngredient and 'main ingredient' property names
  const ingredients = [...new Set(meals.map(meal => meal.mainIngredient || meal['main ingredient']).filter(Boolean))];
  const goals = [...new Set(meals.map(meal => meal.goal).filter(Boolean))];
  
  // Clear existing options first
  mainIngredientSelect.innerHTML = '<option value="">Select Main Ingredient</option>';
  goalSelect.innerHTML = '<option value="">Select Goal</option>';
  
  // Populate main ingredient filter
  ingredients.forEach(ingredient => {
    const option = document.createElement('option');
    option.value = ingredient;
    option.textContent = ingredient;
    mainIngredientSelect.appendChild(option);
  });
  
  // Populate goal filter
  goals.forEach(goal => {
    const option = document.createElement('option');
    option.value = goal;
    option.textContent = goal;
    goalSelect.appendChild(option);
  });
}

window.onload = async function () {
  // Load saved shopping list and selected meals
  const savedShoppingList = localStorage.getItem('shoppingList');
  const savedSelectedMeals = localStorage.getItem('selectedMeals');
  
  // Clear the shopping list first
  const shoppingList = document.getElementById("shoppingList");
  shoppingList.innerHTML = "";
  
  if (savedShoppingList) {
    // Create a temporary container to parse the saved HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = savedShoppingList;
    
    // Process each category
    tempContainer.querySelectorAll('.shopping-category').forEach(category => {
      const categoryName = category.querySelector('.category-header').textContent;
      const categoryKey = Object.keys(shoppingCategories).find(key => 
        shoppingCategories[key] === categoryName
      );
      
      if (categoryKey) {
        // Create new category section
        const newCategorySection = document.createElement("div");
        newCategorySection.id = `category-${categoryKey}`;
        newCategorySection.className = "shopping-category";
        
        const categoryHeader = document.createElement("h3");
        categoryHeader.className = "category-header";
        categoryHeader.textContent = categoryName;
        
        const categoryList = document.createElement("ul");
        categoryList.className = "category-items";
        
        // Process items in this category
        const seenIngredients = new Set();
        category.querySelectorAll('li').forEach(li => {
          const ingredient = li.dataset.ingredient;
          if (!seenIngredients.has(ingredient)) {
            seenIngredients.add(ingredient);
            categoryList.appendChild(li.cloneNode(true));
          }
        });
        
        newCategorySection.appendChild(categoryHeader);
        newCategorySection.appendChild(categoryList);
        shoppingList.appendChild(newCategorySection);
      }
    });
  }
  
  if (savedSelectedMeals) {
    selectedMeals = new Set(JSON.parse(savedSelectedMeals));
    updateSelectedMealsSummary();
  }
  
  // Load meals and initialize meal displays
  await loadMeals();
  
  // Set up event handlers for tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      if (tabId) {
        showTab(tabId);
      }
    });
  });

  // Set up event handlers for special cases
  document.querySelectorAll('.meal-card').forEach(card => {
    card.style.cursor = 'pointer';
  });

  // Set up event handlers for sharing buttons
  const copyToNotesBtn = document.getElementById('copyToNotes');
  const shareWhatsAppBtn = document.getElementById('shareWhatsApp');
  
  if (copyToNotesBtn) {
    copyToNotesBtn.addEventListener('click', copyListToClipboard);
  }
  
  if (shareWhatsAppBtn) {
    shareWhatsAppBtn.addEventListener('click', shareViaWhatsApp);
  }
};

function handleFindMeals() {
  const mainIngredient = document.getElementById('mainIngredient').value;
  const goal = document.getElementById('goal').value;
  
  // Hide welcome message after first search
  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.style.display = 'none';
  }
  
  const filteredMeals = meals.filter(meal => {
    const matchesIngredient = !mainIngredient || (meal.mainIngredient === mainIngredient || meal['main ingredient'] === mainIngredient);
    const matchesGoal = !goal || meal.goal === goal;
    return matchesIngredient && matchesGoal;
  });
  
  // Switch to meal finder tab
  showTab('meal-finder-tab');
  displayMeals(filteredMeals);
}

function showTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.style.display = "none";
  });

  // Remove active class from all tab buttons
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  // Show selected tab content
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.style.display = "block";
  }

  // Add active class to clicked tab button
  const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  if (activeButton) {
    activeButton.classList.add("active");
  }
  
  // Handle hero section visibility
  const heroSection = document.querySelector('.hero');
  if (heroSection) {
    // Show hero section only for inspiration and meal-finder tabs
    if (tabId === 'shopping-tab') {
      heroSection.style.display = 'none';
    } else {
      heroSection.style.display = 'grid';
    }
  }
}

function filterMeals() {
  const mainIngredient = document.getElementById('mainingredientFilter').value;
  const goal = document.getElementById('goalFilter').value;
  const showCalories = document.getElementById('caloriesToggle').checked;
  
  // Hide welcome message after first search
  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.style.display = 'none';
  }
  
  const filteredMeals = meals.filter(meal => {
    const matchesIngredient = !mainIngredient || (meal.mainIngredient === mainIngredient || meal['main ingredient'] === mainIngredient);
    const matchesGoal = !goal || meal.goal === goal;
    return matchesIngredient && matchesGoal;
  });
  
  displayMeals(filteredMeals, showCalories);
}

function displayMeals(mealsToDisplay, showCalories = false) {
  const mealList = document.getElementById('mealList');
  mealList.innerHTML = '';
  
  if (!mealsToDisplay || mealsToDisplay.length === 0) {
    mealList.innerHTML = '<p>No meals found matching your criteria. Try adjusting your filters.</p>';
    return;
  }
  
  mealsToDisplay.forEach(meal => {
    const li = document.createElement('li');
    li.onclick = () => showIngredients(meal);
    
    li.innerHTML = `
      <img src="${meal.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'}" alt="${meal.name}">
      <div class="meal-details">
        <h3>${meal.name}</h3>
        <div class="meal-tags">
          ${meal.cuisine ? `<span class="meal-tag">${meal.cuisine}</span>` : ''}
          ${meal.mainIngredient ? `<span class="meal-tag">${meal.mainIngredient}</span>` : ''}
          ${meal.goal ? `<span class="meal-tag">${meal.goal}</span>` : ''}
          ${meal.bulk ? `<span class="meal-tag">Bulk</span>` : ''}
        </div>
      </div>
    `;
    
    mealList.appendChild(li);
  });
}

function showIngredients(meal) {
  console.log("Full meal data:", meal);
  console.log("Recipe instructions:", meal.recipie);
  
  // Store the current body content to restore later
  const mainContent = document.querySelector('.container.main-content');
  
  // Hide the main content
  mainContent.style.display = 'none';
  
  // Create a full-page recipe container
  const recipeContainer = document.createElement('div');
  recipeContainer.className = 'recipe-page-container';
  
  // Make sure we have ingredients to display
  // Split by commas and filter out macronutrient information
  const ingredientsList = meal.ingredients 
    ? meal.ingredients.split(",")
        .map(i => i.trim())
        .filter(i => !i.toLowerCase().includes('protein') && 
                    !i.toLowerCase().includes('carbs') && 
                    !i.toLowerCase().includes('oil') &&
                    !i.toLowerCase().includes('veggies'))
    : ["No ingredients specified"];
  
  // Add the container first
  document.body.appendChild(recipeContainer);
  
  // Populate with HTML content
  recipeContainer.innerHTML = `
    <nav class="nav">
      <a href="#" class="logo">
        <span class="logo-text">PREP</span>
        <svg class="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 2L3 22"></path>
          <path d="M7 2L7 22"></path>
          <path d="M11 2L11 22"></path>
          <path d="M15 2L15 22"></path>
        </svg>
      </a>
      <div class="nav-tabs">
        <button class="tab-button" data-tab="meal-finder-tab">Find Meals</button>
        <button class="tab-button" data-tab="shopping-tab">Shopping List</button>
      </div>
    </nav>
    
    <div class="recipe-hero">
      <div class="recipe-hero-image">
        <img src="${meal.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'}" alt="${meal.name}">
      </div>
      <div class="recipe-overlay"></div>
    </div>
    
    <div class="recipe-content">
      <div class="recipe-header">
        <h1>${meal.name}</h1>
        <div class="recipe-tags">
          ${meal.cuisine ? `<span class="meal-tag">${meal.cuisine}</span>` : ''}
          ${(meal.mainIngredient || meal['main ingredient']) ? `<span class="meal-tag">${meal.mainIngredient || meal['main ingredient']}</span>` : ''}
          ${meal.goal ? `<span class="meal-tag">${meal.goal}</span>` : ''}
          ${meal.calories ? `<span class="meal-tag">${meal.calories} cal</span>` : ''}
        </div>
      </div>
      
      <div class="recipe-grid">
        <div class="recipe-ingredients">
          <div class="servings-control">
            <h3>Servings</h3>
            <select id="servingsSelect">
              <option value="1">1 serving</option>
              <option value="2">2 servings</option>
              <option value="3">3 servings</option>
              <option value="4">4 servings</option>
              <option value="5">5 servings</option>
            </select>
          </div>
          
          <div class="ingredients-header">
            <h3>Ingredients</h3>
            <button id="selectAllIngredients" class="select-all-btn">Select All</button>
          </div>
          
          <ul id="ingredientsList" class="ingredients-list">
            ${ingredientsList.map(item => {
              const parts = item.split(":");
              if (parts.length === 2) {
                const [ingredient, amount] = parts;
                const baseAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
                const unit = amount.replace(/[0-9.]/g, '').trim();
                return `
                  <li>
                    <div class="ingredient-checkbox">
                      <input type="checkbox" id="ingredient-${ingredient.trim().replace(/\s+/g, '-')}">
                      <label for="ingredient-${ingredient.trim().replace(/\s+/g, '-')}"></label>
                    </div>
                    <div class="ingredient-text">
                      <span class="ingredient-name">${ingredient.trim()}</span>
                      <span class="ingredient-amount" data-base-amount="${baseAmount}" data-unit="${unit}">${baseAmount} ${unit}</span>
                    </div>
                  </li>
                `;
              }
              return `
                <li>
                  <div class="ingredient-checkbox">
                    <input type="checkbox" id="ingredient-${item.trim().replace(/\s+/g, '-')}">
                    <label for="ingredient-${item.trim().replace(/\s+/g, '-')}"></label>
                  </div>
                  <div class="ingredient-text">
                    <span class="ingredient-name">${item.trim()}</span>
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
          
          <div class="recipe-actions">
            <button id="addToShoppingList" class="add-to-list-btn">Add to Shopping List</button>
          </div>
        </div>
        
        <div class="recipe-instructions">
          <h3>Instructions</h3>
          <div class="instructions">
            ${meal['recipie '] || meal.recipie ? `
              <div class="instruction-steps">
                ${(meal['recipie '] || meal.recipie)
                  .split(/(\d+\.)/)
                  .filter(text => text.trim())
                  .map((text, index, array) => {
                    if (text.trim().match(/^\d+\.$/)) {
                      const stepContent = array[index + 1] ? array[index + 1].trim() : '';
                      return `
                        <div class="instruction-step">
                          <div class="step-number">${text}</div>
                          <div class="step-content">${stepContent}</div>
                        </div>
                      `;
                    }
                    return '';
                  }).join('')}
              </div>
            ` : '<p>No instructions available for this recipe.</p>'}
          </div>
        </div>
      </div>
      
      <button id="backToResults" class="back-btn">Back to Results</button>
    </div>
  `;
  
  // Force proper scrolling behavior
  document.body.style.overflow = 'hidden';
  recipeContainer.style.overflowY = 'scroll';
  recipeContainer.scrollTop = 0;
  
  // Set up button actions
  const addToShoppingListBtn = document.getElementById('addToShoppingList');
  const selectAllBtn = document.getElementById('selectAllIngredients');
  const servingsSelect = document.getElementById('servingsSelect');
  const backButton = document.getElementById('backToResults');
  
  // Set up tab button event listeners
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      if (tabId) {
        // Remove the recipe page
        recipeContainer.remove();
        
        // Restore the original content and scrolling
        mainContent.style.display = 'block';
        document.body.style.overflow = 'auto';
        
        // Show the selected tab
        showTab(tabId);
      }
    });
  });
  
  // Update ingredient amounts when servings change
  if (servingsSelect) {
    servingsSelect.addEventListener('change', function() {
      const multiplier = parseInt(this.value);
      document.querySelectorAll('.ingredient-amount').forEach(amountEl => {
        const baseAmount = parseFloat(amountEl.getAttribute('data-base-amount'));
        const unit = amountEl.getAttribute('data-unit');
        if (baseAmount && unit) {
          amountEl.textContent = `${(baseAmount * multiplier).toFixed(1)} ${unit}`;
        }
      });
    });
  }
  
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', function() {
      const checkboxes = document.querySelectorAll('.ingredient-checkbox input[type="checkbox"]');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      
      checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
      });
      
      // Update button text
      selectAllBtn.textContent = allChecked ? 'Select All' : 'Unselect All';
    });
  }
  
  if (addToShoppingListBtn) {
    addToShoppingListBtn.addEventListener('click', function() {
      const servingsValue = parseInt(servingsSelect.value);
      addToShoppingList(ingredientsList, servingsValue, meal.name);
    });
  }
  
  if (backButton) {
    backButton.addEventListener('click', function() {
      // Remove the recipe page
      recipeContainer.remove();
      
      // Restore the original content and scrolling
      mainContent.style.display = 'block';
      document.body.style.overflow = 'auto';
      
      // If we came from the meal inspo tab, refresh the random meals
      const activeTabButton = document.querySelector('.tab-button.active');
      if (activeTabButton && activeTabButton.getAttribute('data-tab') === 'inspiration-tab') {
        displayRandomMeals();
      }
    });
  }

  // Add click handler for logo after HTML is inserted
  const logoLink = recipeContainer.querySelector('.logo');
  logoLink.addEventListener('click', function(event) {
    event.preventDefault();
    recipeContainer.remove();
    mainContent.style.display = 'block';
    document.body.style.overflow = 'auto';
    showTab('meal-finder-tab');
    filterMeals();
  });
}

function saveShoppingList() {
  const shoppingList = document.getElementById("shoppingList");
  localStorage.setItem('shoppingList', shoppingList.innerHTML);
  localStorage.setItem('selectedMeals', JSON.stringify(Array.from(selectedMeals)));
}

// Function to determine category based on ingredient name
function determineCategory(ingredient) {
  ingredient = ingredient.toLowerCase();
  
  // Produce, Fruits & Vegetables
  if (ingredient.includes('lettuce') || ingredient.includes('tomato') || 
      ingredient.includes('onion') || ingredient.includes('pepper') || 
      ingredient.includes('carrot') || ingredient.includes('broccoli') ||
      ingredient.includes('spinach') || ingredient.includes('kale') ||
      ingredient.includes('fruit') || ingredient.includes('vegetable') ||
      ingredient.includes('apple') || ingredient.includes('banana') ||
      ingredient.includes('berry') || ingredient.includes('orange') ||
      ingredient.includes('lemon') || ingredient.includes('lime') ||
      ingredient.includes('garlic') || ingredient.includes('potato')) {
    return 'produce';
  }
  
  // Meat & Protein
  if (ingredient.includes('chicken') || ingredient.includes('beef') || 
      ingredient.includes('pork') || ingredient.includes('fish') ||
      ingredient.includes('turkey') || ingredient.includes('lamb') ||
      ingredient.includes('tofu') || ingredient.includes('bean') ||
      ingredient.includes('lentil') || ingredient.includes('protein')) {
    return 'meat';
  }
  
  // Dairy, Eggs & Cheese
  if (ingredient.includes('milk') || ingredient.includes('cheese') || 
      ingredient.includes('yogurt') || ingredient.includes('cream') ||
      ingredient.includes('egg') || ingredient.includes('butter')) {
    return 'dairy';
  }
  
  // Spices & Seasonings
  if (ingredient.includes('spice') || ingredient.includes('salt') || 
      ingredient.includes('pepper') || ingredient.includes('herb') ||
      ingredient.includes('seasoning') || ingredient.includes('cumin') ||
      ingredient.includes('cinnamon') || ingredient.includes('basil') ||
      ingredient.includes('oregano') || ingredient.includes('thyme')) {
    return 'spices';
  }
  
  // Pantry Staples
  if (ingredient.includes('flour') || ingredient.includes('sugar') || 
      ingredient.includes('rice') || ingredient.includes('pasta') ||
      ingredient.includes('oil') || ingredient.includes('vinegar') ||
      ingredient.includes('sauce') || ingredient.includes('can') ||
      ingredient.includes('grain') || ingredient.includes('cereal')) {
    return 'pantry';
  }
  
  // Frozen Foods
  if (ingredient.includes('frozen') || ingredient.includes('ice')) {
    return 'frozen';
  }
  
  // Bakery & Bread
  if (ingredient.includes('bread') || ingredient.includes('bun') || 
      ingredient.includes('roll') || ingredient.includes('bagel') ||
      ingredient.includes('pastry') || ingredient.includes('cake')) {
    return 'bakery';
  }
  
  // Default to Other
  return 'other';
}

// Function to get category icon
function getCategoryIcon(category) {
  const icons = {
    produce: '🥬',
    meat: '🥩',
    dairy: '🥛',
    spices: '🌶️',
    pantry: '🥫',
    frozen: '🧊',
    bakery: '🥖',
    other: '📦'
  };
  return icons[category] || '📦';
}

function updateSelectedMealsSummary() {
  const selectedMealsList = document.getElementById("selectedMealsList");
  if (!selectedMealsList) return;
  
  const mealCount = selectedMeals.size;
  const summaryHeader = document.getElementById("selectedMealsSummary");
  
  // Calculate insights
  let totalCalories = 0;
  let servingsCount = 0;
  
  selectedMeals.forEach(mealName => {
    const meal = meals.find(m => m.name === mealName);
    if (meal && meal.calories) {
      const servings = parseInt(localStorage.getItem(`servings_${mealName}`)) || 1;
      totalCalories += parseInt(meal.calories) * servings;
      servingsCount += servings;
    }
  });
  
  const averageCalories = servingsCount > 0 ? Math.round(totalCalories / servingsCount) : 0;
  
  // Generate insight message
  let insightMessage = '';
  if (servingsCount > 0) {
    if (averageCalories < 500) {
      insightMessage = `You're averaging ${averageCalories} calories per serving. Perfect for light, nutritious eating! 🌱`;
    } else if (averageCalories < 800) {
      insightMessage = `You're averaging ${averageCalories} calories per serving. Great balance of nutrition and energy! ⚖️`;
    } else {
      insightMessage = `You're averaging ${averageCalories} calories per serving. Perfect for active lifestyles! 💪`;
    }
  }
  
  // Get the shopping list to check if it has items
  const shoppingList = document.getElementById("shoppingList");
  const hasItems = shoppingList && shoppingList.children.length > 0;
  
  if (summaryHeader) {
    if (!hasItems) {
      // Only show the "click find meals" message when there are no items
      summaryHeader.innerHTML = `
        <div class="shopping-list-header">
          <h2>Your Shopping List is empty!</h2>
          <p class="shopping-insight">Click Find Meals and come back once you've selected some tasty food! 😋</p>
        </div>
      `;
    } else {
      // Show insights when there are items
      let headerMessage = '';
      if (servingsCount > 0) {
        headerMessage = insightMessage;
      } else {
        // Generate a random fun fact if no calorie data
        const funFacts = [
          "Meal prepping can save you up to 5 hours per week! 🕒",
          "Planning meals reduces food waste by up to 40%! 🌱",
          "Organized shopping lists can cut grocery bills by 20%! 💰",
          "Home-cooked meals have 50% less calories than takeout! 🥗",
          "You're on your way to healthier eating habits! 💪"
        ];
        headerMessage = funFacts[Math.floor(Math.random() * funFacts.length)];
      }
      
      summaryHeader.innerHTML = `
        <div class="shopping-list-header">
          <h2>Your Shopping List</h2>
          <p class="shopping-insight">${headerMessage}</p>
        </div>
        ${selectedMeals.size > 0 ? `
          <div class="selected-meals-counter">
            <h3>Selected Meals (${mealCount})</h3>
            <div id="selectedMealsList"></div>
          </div>
        ` : ''}
      `;
    }
  }
  
  // Create a new list if it doesn't exist and there are selected meals
  const mealsList = document.getElementById("selectedMealsList");
  if (mealsList && selectedMeals.size > 0) {
    mealsList.innerHTML = ''; // Clear existing content
    
    selectedMeals.forEach(mealName => {
      const meal = meals.find(m => m.name === mealName);
      const calories = meal ? meal.calories : null;
      const servings = parseInt(localStorage.getItem(`servings_${mealName}`)) || 1;
      const li = document.createElement("li");
      li.className = "selected-meal-item";
      li.innerHTML = `
        <div class="meal-info">
          <span class="meal-name">${mealName}</span>
          <div class="meal-details">
            ${calories ? `<span class="meal-calories">${calories} cal per serving</span>` : ''}
            <span class="meal-servings">${servings} ${servings === 1 ? 'serving' : 'servings'}</span>
          </div>
        </div>
        <button class="remove-item" onclick="removeMealFromList('${mealName}')">×</button>
      `;
      mealsList.appendChild(li);
    });
  }
}

// Update the addToShoppingList function to include category icons
function addToShoppingList(ingredientsList, multiplier, mealName) {
  const shoppingList = document.getElementById("shoppingList");
  const addToShoppingListBtn = document.getElementById('addToShoppingList');
  
  // Add meal to selected meals
  selectedMeals.add(mealName);
  
  // Store the servings count in localStorage
  localStorage.setItem(`servings_${mealName}`, multiplier.toString());
  
  // Find the current meal to get calorie information
  const currentMeal = meals.find(m => m.name === mealName);
  console.log("Adding meal to shopping list:", currentMeal); // Debug log
  
  // Process each ingredient first
  ingredientsList.forEach(item => {
    const parts = item.split(":");
    if (parts.length === 2) {
      const [ingredient, amount] = parts;
      const adjustedAmount = parseFloat(amount) * multiplier;
      const metric = amount.replace(/[0-9.]/g, '').trim();
      const trimmedIngredient = ingredient.trim();
      
      // Determine category for this ingredient
      const category = determineCategory(trimmedIngredient);
      
      // Create category section if it doesn't exist
      let categorySection = document.getElementById(`category-${category}`);
      if (!categorySection) {
        categorySection = document.createElement("div");
        categorySection.id = `category-${category}`;
        categorySection.className = "shopping-category";
        
        const categoryHeader = document.createElement("h3");
        categoryHeader.className = "category-header";
        categoryHeader.innerHTML = `
          <span class="category-icon">${getCategoryIcon(category)}</span>
          ${shoppingCategories[category]}
        `;
        
        const categoryList = document.createElement("ul");
        categoryList.className = "category-items";
        
        categorySection.appendChild(categoryHeader);
        categorySection.appendChild(categoryList);
        shoppingList.appendChild(categorySection);
      }
      
      // Check if ingredient exists in any category
      let existingItem = null;
      let existingCategory = null;
      
      // Search through all categories for the ingredient
      document.querySelectorAll('.category-items').forEach(catList => {
        const foundItem = Array.from(catList.children).find(li => 
          li.dataset.ingredient === trimmedIngredient);
        if (foundItem) {
          existingItem = foundItem;
          existingCategory = catList;
        }
      });
      
      if (existingItem) {
        // Update existing item
        const currentAmount = parseFloat(existingItem.dataset.amount);
        const newAmount = currentAmount + adjustedAmount;
        existingItem.dataset.amount = newAmount;
        existingItem.innerHTML = `
          <div class="ingredient-info">
            <span class="ingredient-name">${trimmedIngredient}</span>
            <span class="ingredient-amount" contenteditable="true" data-original="${newAmount}">${newAmount} ${metric}</span>
          </div>
          <button class="remove-item" onclick="removeFromShoppingList(this)">×</button>
        `;
      } else {
        // Add new item to the correct category
        const categoryList = categorySection.querySelector(".category-items");
        const li = document.createElement("li");
        li.dataset.ingredient = trimmedIngredient;
        li.dataset.amount = adjustedAmount;
        li.innerHTML = `
          <div class="ingredient-info">
            <span class="ingredient-name">${trimmedIngredient}</span>
            <span class="ingredient-amount" contenteditable="true" data-original="${adjustedAmount}">${adjustedAmount} ${metric}</span>
          </div>
          <button class="remove-item" onclick="removeFromShoppingList(this)">×</button>
        `;
        categoryList.appendChild(li);
      }
    }
  });
  
  // Save the shopping list
  saveShoppingList();
  
  // Update the shopping list header with insights
  const summaryHeader = document.getElementById("selectedMealsSummary");
  if (summaryHeader) {
    // Calculate total calories for this meal
    let totalCalories = 0;
    let servingsCount = 0;
    
    selectedMeals.forEach(name => {
      const meal = meals.find(m => m.name === name);
      if (meal && meal.calories) {
        const servings = parseInt(localStorage.getItem(`servings_${name}`)) || 1;
        totalCalories += parseInt(meal.calories) * servings;
        servingsCount += servings;
      }
    });
    
    const averageCalories = servingsCount > 0 ? Math.round(totalCalories / servingsCount) : 0;
    console.log("Calories calculation:", { totalCalories, servingsCount, averageCalories }); // Debug log
    
    let insightMessage = '';
    if (servingsCount > 0) {
      if (averageCalories < 500) {
        insightMessage = `You're averaging ${averageCalories} calories per serving. Perfect for light, nutritious eating! 🌱`;
      } else if (averageCalories < 800) {
        insightMessage = `You're averaging ${averageCalories} calories per serving. Great balance of nutrition and energy! ⚖️`;
      } else {
        insightMessage = `You're averaging ${averageCalories} calories per serving. Perfect for active lifestyles! 💪`;
      }
    } else {
      // If no calorie data, show a random fun fact
      const funFacts = [
        "Meal prepping can save you up to 5 hours per week! 🕒",
        "Planning meals reduces food waste by up to 40%! 🌱",
        "Organized shopping lists can cut grocery bills by 20%! 💰",
        "Home-cooked meals have 50% less calories than takeout! 🥗",
        "You're on your way to healthier eating habits! 💪"
      ];
      insightMessage = funFacts[Math.floor(Math.random() * funFacts.length)];
    }
    
    summaryHeader.innerHTML = `
      <div class="shopping-list-header">
        <h2>Your Shopping List</h2>
        <p class="shopping-insight">${insightMessage}</p>
      </div>
    `;
  }
  
  // Update button text to indicate items were added
  if (addToShoppingListBtn) {
    addToShoppingListBtn.textContent = 'Added to Shopping List';
    addToShoppingListBtn.style.backgroundColor = 'var(--success-color, #4CAF50)';
    
    // Reset button after 2 seconds
    setTimeout(() => {
      addToShoppingListBtn.textContent = 'Add to Shopping List';
      addToShoppingListBtn.style.backgroundColor = '';
    }, 2000);
  }
  
  // Switch to shopping list tab
  showTab('shopping-tab');
}

// Function to remove item from shopping list
function removeFromShoppingList(button) {
  const li = button.parentElement;
  const categoryList = li.parentElement;
  const categorySection = categoryList.parentElement;
  
  li.remove();
  
  // If category is empty, remove the entire category section
  if (categoryList.children.length === 0) {
    categorySection.remove();
  }
  
  saveShoppingList();
}

function clearShoppingList() {
  const shoppingList = document.getElementById("shoppingList");
  shoppingList.innerHTML = "";
  selectedMeals.clear();
  updateSelectedMealsSummary();
  saveShoppingList();
}

function copyListToClipboard() {
  const shoppingList = document.getElementById('shoppingList');
  let text = 'Shopping List:\n\n';
  
  // Add selected meals
  if (selectedMeals.size > 0) {
    text += 'Selected Meals:\n';
    selectedMeals.forEach(meal => {
      const servings = parseInt(localStorage.getItem(`servings_${meal}`)) || 1;
      text += `- ${meal} (${servings} ${servings === 1 ? 'serving' : 'servings'})\n`;
    });
    text += '\n';
  }
  
  // Add categorized items
  const categories = shoppingList.querySelectorAll('.shopping-category');
  categories.forEach(category => {
    const categoryName = category.querySelector('.category-header').textContent;
    // Remove the emoji from category name
    const cleanCategoryName = categoryName.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    const items = category.querySelectorAll('li');
    
    if (items.length > 0) {
      text += `${cleanCategoryName}\n`;
      items.forEach(item => {
        const ingredientName = item.querySelector('.ingredient-name').textContent;
        const ingredientAmount = item.querySelector('.ingredient-amount').textContent;
        text += `- ${ingredientName}: ${ingredientAmount}\n`;
      });
      text += '\n';
    }
  });
  
  // Copy to clipboard
  navigator.clipboard.writeText(text);
}

function shareViaWhatsApp() {
  const shoppingList = document.getElementById('shoppingList');
  let text = 'Shopping List:\n\n';
  
  // Add selected meals
  if (selectedMeals.size > 0) {
    text += 'Selected Meals:\n';
    selectedMeals.forEach(meal => {
      const servings = parseInt(localStorage.getItem(`servings_${meal}`)) || 1;
      text += `- ${meal} (${servings} ${servings === 1 ? 'serving' : 'servings'})\n`;
    });
    text += '\n';
  }
  
  // Add categorized items
  const categories = shoppingList.querySelectorAll('.shopping-category');
  categories.forEach(category => {
    const categoryName = category.querySelector('.category-header').textContent;
    // Remove the emoji from category name
    const cleanCategoryName = categoryName.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    const items = category.querySelectorAll('li');
    
    if (items.length > 0) {
      text += `${cleanCategoryName}\n`;
      items.forEach(item => {
        const ingredientName = item.querySelector('.ingredient-name').textContent;
        const ingredientAmount = item.querySelector('.ingredient-amount').textContent;
        text += `- ${ingredientName}: ${ingredientAmount}\n`;
      });
      text += '\n';
    }
  });
  
  // Create WhatsApp share URL
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
  window.location.href = whatsappUrl;
}

// Add this function for mobile menu
function toggleMobileMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  mobileMenu.classList.toggle('active');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileMenuButton = document.querySelector('.mobile-menu-button');
  
  if (!mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
    mobileMenu.classList.remove('active');
  }
});

// Function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Function to display random meals
function displayRandomMeals() {
  if (!meals.length) return;
  
  // Filter out any incomplete meals first
  const validMeals = meals.filter(meal => 
    meal.name && 
    meal.image && 
    meal.mainIngredient || meal['main ingredient']
  );
  
  const shuffledMeals = shuffleArray([...validMeals]);
  const randomMeals = shuffledMeals.slice(0, 9);
  const randomMealList = document.getElementById('randomMealList');
  
  // Clear existing content
  randomMealList.innerHTML = '';
  
  // Create and append each meal card with proper event listeners
  randomMeals.forEach(meal => {
    const mealCard = document.createElement('div');
    mealCard.className = 'meal-card';
    mealCard.style.cursor = 'pointer';
    
    // Create HTML structure for the meal card
    mealCard.innerHTML = `
      <img src="${meal.image}" alt="${meal.name}" onerror="this.src='https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'">
      <div class="meal-card-content">
        <h3>${meal.name}</h3>
        <div class="meal-tags">
          ${meal.cuisine ? `<span class="meal-tag">${meal.cuisine}</span>` : ''}
          ${(meal.mainIngredient || meal['main ingredient']) ? `<span class="meal-tag">${meal.mainIngredient || meal['main ingredient']}</span>` : ''}
          ${meal.goal ? `<span class="meal-tag">${meal.goal}</span>` : ''}
          ${meal.calories ? `<span class="meal-tag">${meal.calories} cal</span>` : ''}
        </div>
      </div>
    `;
    
    mealCard.addEventListener('click', () => {
      showIngredients(meal);
    });
    
    randomMealList.appendChild(mealCard);
  });
}

// Function to remove meal from list
function removeMealFromList(mealName) {
  // Remove from selected meals
  selectedMeals.delete(mealName);
  
  // Remove servings from localStorage
  localStorage.removeItem(`servings_${mealName}`);
  
  // Remove ingredients for this meal from shopping list
  const meal = meals.find(m => m.name === mealName);
  if (meal && meal.ingredients) {
    const ingredients = meal.ingredients.split(',').map(i => i.trim());
    ingredients.forEach(ingredient => {
      const ingredientName = ingredient.split(':')[0].trim();
      document.querySelectorAll('.category-items li').forEach(li => {
        if (li.dataset.ingredient === ingredientName) {
          li.remove();
        }
      });
    });
    
    // Remove empty categories
    document.querySelectorAll('.shopping-category').forEach(category => {
      if (category.querySelector('.category-items').children.length === 0) {
        category.remove();
      }
    });
  }
  
  // Update the shopping list header with insights
  const summaryHeader = document.getElementById("selectedMealsSummary");
  if (summaryHeader) {
    // Calculate total calories
    let totalCalories = 0;
    let servingsCount = 0;
    
    selectedMeals.forEach(name => {
      const meal = meals.find(m => m.name === name);
      if (meal && meal.calories) {
        const servings = parseInt(localStorage.getItem(`servings_${name}`)) || 1;
        totalCalories += parseInt(meal.calories) * servings;
        servingsCount += servings;
      }
    });
    
    const averageCalories = servingsCount > 0 ? Math.round(totalCalories / servingsCount) : 0;
    console.log("Calories calculation after removal:", { totalCalories, servingsCount, averageCalories }); // Debug log
    
    let insightMessage = '';
    if (servingsCount > 0) {
      if (averageCalories < 500) {
        insightMessage = `You're averaging ${averageCalories} calories per serving. Perfect for light, nutritious eating! 🌱`;
      } else if (averageCalories < 800) {
        insightMessage = `You're averaging ${averageCalories} calories per serving. Great balance of nutrition and energy! ⚖️`;
      } else {
        insightMessage = `You're averaging ${averageCalories} calories per serving. Perfect for active lifestyles! 💪`;
      }
    } else {
      // If shopping list is empty, show the default message
      if (document.querySelectorAll('.shopping-category').length === 0) {
        summaryHeader.innerHTML = `
          <div class="shopping-list-header">
            <h2>Your Shopping List is empty!</h2>
            <p class="shopping-insight">Click Find Meals and come back once you've selected some tasty food! 😋</p>
          </div>
        `;
        saveShoppingList();
        return;
      }
      // Otherwise show a fun fact
      const funFacts = [
        "Meal prepping can save you up to 5 hours per week! 🕒",
        "Planning meals reduces food waste by up to 40%! 🌱",
        "Organized shopping lists can cut grocery bills by 20%! 💰",
        "Home-cooked meals have 50% less calories than takeout! 🥗",
        "You're on your way to healthier eating habits! 💪"
      ];
      insightMessage = funFacts[Math.floor(Math.random() * funFacts.length)];
    }
    
    summaryHeader.innerHTML = `
      <div class="shopping-list-header">
        <h2>Your Shopping List</h2>
        <p class="shopping-insight">${insightMessage}</p>
      </div>
      ${selectedMeals.size > 0 ? `
        <div class="selected-meals-counter">
          <h3>Selected Meals (${selectedMeals.size})</h3>
          <div id="selectedMealsList"></div>
        </div>
      ` : ''}
    `;
    
    // Update the selected meals list
    const mealsList = document.getElementById("selectedMealsList");
    if (mealsList) {
      mealsList.innerHTML = '';
      selectedMeals.forEach(name => {
        const meal = meals.find(m => m.name === name);
        const calories = meal ? meal.calories : null;
        const servings = parseInt(localStorage.getItem(`servings_${name}`)) || 1;
        const li = document.createElement("li");
        li.className = "selected-meal-item";
        li.innerHTML = `
          <div class="meal-info">
            <span class="meal-name">${name}</span>
            <div class="meal-details">
              ${calories ? `<span class="meal-calories">${calories} cal per serving</span>` : ''}
              <span class="meal-servings">${servings} ${servings === 1 ? 'serving' : 'servings'}</span>
            </div>
          </div>
          <button class="remove-item" onclick="removeMealFromList('${name}')">×</button>
        `;
        mealsList.appendChild(li);
      });
    }
  }
  
  saveShoppingList();
}