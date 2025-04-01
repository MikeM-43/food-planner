let meals = [];
let selectedMeals = new Set();

// Define shopping list categories
const shoppingCategories = {
  produce: 'Produce',
  meat: 'Meat',
  dairy: 'Dairy, Eggs & Cheese',
  household: 'Household Items',
  alcohol: 'Wine, Beer & Spirits',
  frozen: 'Frozen Foods',
  sauces: 'Sauces & Spices',
  other: 'Other'
};

window.onload = async function () {
  try {
    const response = await fetch('https://sheetdb.io/api/v1/uuj8ranlqzt8f'); // replace this with your SheetDB URL
    meals = await response.json();
  } catch (error) {
    console.error("Failed to load meals:", error);
  }
  
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
  
  // Show meal finder tab by default
  showTab('meal-tab');
};

// Tab navigation
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
  document.getElementById(tabId).style.display = "block";

  // Add active class to clicked tab button
  const activeButton = document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`);
  if (activeButton) {
    activeButton.classList.add("active");
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
    const matchesIngredient = !mainIngredient || meal['main ingredient'] === mainIngredient;
    const matchesGoal = !goal || meal.goal === goal;
    return matchesIngredient && matchesGoal;
  });
  
  displayMeals(filteredMeals, showCalories);
}

function displayMeals(mealsToShow, showCalories = false) {
  const list = document.getElementById("mealList");
  list.innerHTML = "";
  
  if (mealsToShow.length === 0) {
    const noResults = document.createElement("p");
    noResults.textContent = "No results, please search again for some yummy food options 💪";
    noResults.style.fontSize = "18px";
    noResults.style.textAlign = "center";
    noResults.style.marginTop = "20px";
    list.appendChild(noResults);
    return;
  }

  mealsToShow.forEach((meal, index) => {
    const li = document.createElement("li");
    
    const img = document.createElement("img");
    img.src = meal.image || "https://via.placeholder.com/300x180?text=Yummy+Food";
    img.alt = meal.name;
    
    const detailsDiv = document.createElement("div");
    detailsDiv.className = "meal-details";
    
    const nameHeading = document.createElement("h3");
    nameHeading.textContent = meal.name;
    nameHeading.style.cursor = "pointer";
    nameHeading.onclick = () => showIngredients(meal);
    
    const tagsDiv = document.createElement("div");
    tagsDiv.className = "meal-tags";
    
    if (meal['main ingredient']) {
      const ingTag = document.createElement("span");
      ingTag.className = "meal-tag";
      ingTag.textContent = meal['main ingredient'];
      tagsDiv.appendChild(ingTag);
    }
    
    if (meal.goal) {
      const goalTag = document.createElement("span");
      goalTag.className = "meal-tag goal-tag";
      goalTag.textContent = meal.goal;
      tagsDiv.appendChild(goalTag);
    }
    
    if (showCalories && meal.calories) {
      const caloriesSpan = document.createElement("span");
      caloriesSpan.className = "calories";
      caloriesSpan.textContent = `${meal.calories} kcal`;
      detailsDiv.appendChild(nameHeading);
      detailsDiv.appendChild(tagsDiv);
      detailsDiv.appendChild(caloriesSpan);
    } else {
      detailsDiv.appendChild(nameHeading);
      detailsDiv.appendChild(tagsDiv);
    }
    
    li.appendChild(img);
    li.appendChild(detailsDiv);
    list.appendChild(li);
  });
}

function showIngredients(meal) {
  const list = document.getElementById("mealList");
  const ingredientsPanel = document.createElement("div");
  ingredientsPanel.className = "ingredients-panel";
  
  // Title with meal name
  const title = document.createElement("h3");
  title.textContent = meal.name;
  title.className = "recipe-title";
  ingredientsPanel.appendChild(title);
  
  // Parse ingredients
  const ingredientsList = meal.ingredients ? meal.ingredients.split(",").map(i => i.trim()) : [];
  
  // Servings selector
  const servingsDiv = document.createElement("div");
  servingsDiv.className = "servings-control";
  
  const qtyLabel = document.createElement("label");
  qtyLabel.textContent = "Number of servings:";
  qtyLabel.htmlFor = "servingsSelect";
  
  const qtySelect = document.createElement("select");
  qtySelect.id = "servingsSelect";
  for (let i = 1; i <= 5; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    qtySelect.appendChild(option);
  }
  
  servingsDiv.appendChild(qtyLabel);
  servingsDiv.appendChild(qtySelect);
  ingredientsPanel.appendChild(servingsDiv);
  
  // Ingredients list
  const ul = document.createElement("ul");
  ul.className = "ingredients-list";
  
  function renderIngredients(multiplier) {
    ul.innerHTML = "";
    ingredientsList.forEach(item => {
      const parts = item.split(":");
      if (parts.length === 2) {
        const [ingredient, amount] = parts;
        const adjustedAmount = parseFloat(amount) * multiplier;
        // Extract the metric from the amount (e.g., "500g" -> "500 g")
        const metric = amount.replace(/[0-9.]/g, '').trim();
        const li = document.createElement("li");
        li.textContent = `${ingredient.trim()}: ${adjustedAmount} ${metric}`;
        ul.appendChild(li);
      } else {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      }
    });
  }
  
  qtySelect.onchange = () => renderIngredients(parseInt(qtySelect.value));
  renderIngredients(1); // default to 1
  
  ingredientsPanel.appendChild(ul);
  
  // Add to shopping list button
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add to Shopping List";
  addBtn.className = "add-to-list-btn";
  addBtn.onclick = () => {
    addToShoppingList(ingredientsList, parseInt(qtySelect.value), meal.name);
    showTab('shopping-tab'); // Switch to shopping list tab
  };
  
  ingredientsPanel.appendChild(addBtn);
  
  // Back button
  const backBtn = document.createElement("button");
  backBtn.textContent = "Back to Results";
  backBtn.className = "back-btn";
  backBtn.onclick = () => filterMeals(); // Go back to meal list
  
  ingredientsPanel.appendChild(backBtn);
  
  list.innerHTML = "";
  list.appendChild(ingredientsPanel);
}

function saveShoppingList() {
  const shoppingList = document.getElementById("shoppingList");
  localStorage.setItem('shoppingList', shoppingList.innerHTML);
  localStorage.setItem('selectedMeals', JSON.stringify(Array.from(selectedMeals)));
  
  // Show save confirmation
  const saveMessage = document.createElement('div');
  saveMessage.className = 'save-message';
  saveMessage.textContent = '✓ Saved';
  document.body.appendChild(saveMessage);
  
  // Remove the message after 2 seconds
  setTimeout(() => {
    saveMessage.remove();
  }, 2000);
}

// Function to determine category based on ingredient name
function determineCategory(ingredient) {
  ingredient = ingredient.toLowerCase();
  
  // Produce
  if (ingredient.includes('lettuce') || ingredient.includes('tomato') || 
      ingredient.includes('onion') || ingredient.includes('pepper') || 
      ingredient.includes('carrot') || ingredient.includes('broccoli') ||
      ingredient.includes('spinach') || ingredient.includes('kale') ||
      ingredient.includes('fruit') || ingredient.includes('vegetable')) {
    return 'produce';
  }
  
  // Meat
  if (ingredient.includes('chicken') || ingredient.includes('beef') || 
      ingredient.includes('pork') || ingredient.includes('fish') ||
      ingredient.includes('turkey') || ingredient.includes('lamb')) {
    return 'meat';
  }
  
  // Dairy
  if (ingredient.includes('milk') || ingredient.includes('cheese') || 
      ingredient.includes('yogurt') || ingredient.includes('cream') ||
      ingredient.includes('egg') || ingredient.includes('butter')) {
    return 'dairy';
  }
  
  // Household
  if (ingredient.includes('paper') || ingredient.includes('foil') || 
      ingredient.includes('wrap') || ingredient.includes('bag')) {
    return 'household';
  }
  
  // Alcohol
  if (ingredient.includes('wine') || ingredient.includes('beer') || 
      ingredient.includes('spirit') || ingredient.includes('vodka') ||
      ingredient.includes('rum') || ingredient.includes('gin')) {
    return 'alcohol';
  }
  
  // Frozen
  if (ingredient.includes('frozen') || ingredient.includes('ice')) {
    return 'frozen';
  }
  
  // Sauces & Spices
  if (ingredient.includes('sauce') || ingredient.includes('spice') || 
      ingredient.includes('seasoning') || ingredient.includes('oil') ||
      ingredient.includes('vinegar') || ingredient.includes('dressing')) {
    return 'sauces';
  }
  
  // Default to Other
  return 'other';
}

// Function to add item to shopping list
function addToShoppingList(ingredientsList, multiplier, mealName) {
  const shoppingList = document.getElementById("shoppingList");
  
  // Add meal to selected meals
  selectedMeals.add(mealName);
  updateSelectedMealsSummary();
  
  // Process each ingredient
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
        categoryHeader.textContent = shoppingCategories[category];
        
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
          <span>${trimmedIngredient}: ${newAmount} ${metric}</span>
          <button class="remove-item" onclick="removeFromShoppingList(this)">×</button>
        `;
      } else {
        // Add new item to the correct category
        const categoryList = categorySection.querySelector(".category-items");
        const li = document.createElement("li");
        li.dataset.ingredient = trimmedIngredient;
        li.dataset.amount = adjustedAmount;
        li.innerHTML = `
          <span>${trimmedIngredient}: ${adjustedAmount} ${metric}</span>
          <button class="remove-item" onclick="removeFromShoppingList(this)">×</button>
        `;
        categoryList.appendChild(li);
      }
    }
  });
  
  // Save after adding items
  saveShoppingList();
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

function updateSelectedMealsSummary() {
  const selectedMealsList = document.getElementById("selectedMealsList");
  selectedMealsList.innerHTML = "";
  
  selectedMeals.forEach(mealName => {
    const li = document.createElement("li");
    li.textContent = mealName;
    selectedMealsList.appendChild(li);
  });
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
      text += `- ${meal}\n`;
    });
    text += '\n';
  }
  
  // Add categorized items
  const categories = shoppingList.querySelectorAll('.shopping-category');
  categories.forEach(category => {
    const categoryName = category.querySelector('.category-header').textContent;
    const items = category.querySelectorAll('li');
    
    text += `${categoryName}:\n`;
    items.forEach(item => {
      text += `- ${item.querySelector('span').textContent}\n`;
    });
    text += '\n';
  });
  
  navigator.clipboard.writeText(text).then(() => {
    showSaveMessage('List copied to clipboard!');
  });
}

function emailList() {
  const shoppingList = document.getElementById('shoppingList');
  let text = 'Shopping List:\n\n';
  
  // Add selected meals
  if (selectedMeals.size > 0) {
    text += 'Selected Meals:\n';
    selectedMeals.forEach(meal => {
      text += `- ${meal}\n`;
    });
    text += '\n';
  }
  
  // Add categorized items
  const categories = shoppingList.querySelectorAll('.shopping-category');
  categories.forEach(category => {
    const categoryName = category.querySelector('.category-header').textContent;
    const items = category.querySelectorAll('li');
    
    text += `${categoryName}:\n`;
    items.forEach(item => {
      text += `- ${item.querySelector('span').textContent}\n`;
    });
    text += '\n';
  });
  
  const mailtoLink = `mailto:?subject=Shopping List&body=${encodeURIComponent(text)}`;
  window.location.href = mailtoLink;
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
  
  