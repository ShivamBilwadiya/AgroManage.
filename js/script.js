document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('farm-form');
    const submitBtn = document.getElementById('generate-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.getElementById('btn-loader');

    // Result Sections
    
    const resultsSection = document.getElementById('results');
    const cropCardsContainer = document.getElementById('crop-cards');
    const totalProfitEl = document.getElementById('res-total-profit');
    const landUtilEl = document.getElementById('res-land-util');
    const visualGrid = document.getElementById('visual-grid');
    const gridLegend = document.getElementById('grid-legend');

    // Fetch crops on load and set default date
    const customPreferredCropsContainer = document.getElementById('custom_preferred_crops_container');
    const preferredCropsHidden = document.getElementById('preferred_crops_hidden');
    let selectedPreferredCrops = [];

    fetch('/crops')
        .then(res => res.json())
        .then(data => {
            if (!data || !customPreferredCropsContainer) return;
            customPreferredCropsContainer.innerHTML = ''; // Clear loading state if any

            data.forEach(crop => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'custom-select-item';
                itemDiv.dataset.value = crop;
                itemDiv.textContent = crop;

                // Click handler for toggling selection
                itemDiv.addEventListener('click', () => {
                    itemDiv.classList.toggle('selected');
                    if (itemDiv.classList.contains('selected')) {
                        selectedPreferredCrops.push(crop);
                    } else {
                        selectedPreferredCrops = selectedPreferredCrops.filter(c => c !== crop);
                    }
                    // Update hidden input used by FormData
                    preferredCropsHidden.value = JSON.stringify(selectedPreferredCrops);
                });

                customPreferredCropsContainer.appendChild(itemDiv);
            });
        })
        .catch(err => console.error("Failed to load crops:", err));

    const sowingDateInput = document.getElementById('sowing_date');
    if (sowingDateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        sowingDateInput.value = formattedDate;
        sowingDateInput.setAttribute('min', formattedDate);
    }

    // Color palette for the grid allocations
    const cropColors = [
        '#48BB78', // Green
        '#F6E05E', // Yellow
        '#ED8936', // Orange
        '#4299E1', // Blue
        '#9F7AEA'  // Purple
    ];

    // Format currency to Indian Rupees
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Smooth scroll to results
    const scrollToResults = () => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Loading State
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        submitBtn.disabled = true;

        // 2. Gather Data
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        // Handle multi-select for preferred_crops explicitly from hidden input
        try {
            payload.preferred_crops = JSON.parse(formData.get('preferred_crops') || "[]");
        } catch (e) {
            payload.preferred_crops = [];
        }

        try {
            // 3. API Request
            const response = await fetch('/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch recommendations');
            }

            // 4. Update UI
            renderResults(data);

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while generating the plan. Please check your inputs and try again.');
        } finally {
            // 5. Reset Loading State
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    let currentPlanData = null;
    let currentActiveCropNames = new Set();

    // Attach event delegation for crop card toggling
    cropCardsContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.crop-card');
        if (card) {
            const cropName = card.dataset.cropName;
            if (currentActiveCropNames.has(cropName)) {
                currentActiveCropNames.delete(cropName);
            } else {
                currentActiveCropNames.add(cropName);
            }
            updateInteractiveUI();
        }
    });

    function renderResults(data) {
        currentPlanData = data;

        // Show the hidden results section
        resultsSection.classList.remove('hidden');

        // By default, activate up to the top 4 crops that are actually selectable
        currentActiveCropNames = new Set();
        if (data.crops) {
            const selectableCrops = data.crops.filter(c => c.selectable !== false);
            selectableCrops.slice(0, 4).forEach(c => currentActiveCropNames.add(c.name));
        }

        updateInteractiveUI();

        // Scroll to see results
        setTimeout(scrollToResults, 100);
    }

    function updateInteractiveUI() {
        if (!currentPlanData || !currentPlanData.crops) return;

        // 1. Calculate Allocations for Active Crops
        let activeCrops = currentPlanData.crops.filter(c => currentActiveCropNames.has(c.name));
        let inactiveCrops = currentPlanData.crops.filter(c => !currentActiveCropNames.has(c.name));
        let totalScoreSum = activeCrops.reduce((sum, c) => sum + Math.max(0, c.total_score), 0);

        let totalAlloc = 0;
        activeCrops.forEach(c => {
            if (totalScoreSum > 0) {
                c.allocation_percent = Math.round((Math.max(0, c.total_score) / totalScoreSum) * 100);
            } else {
                c.allocation_percent = Math.round(100 / activeCrops.length);
            }
            totalAlloc += c.allocation_percent;
        });

        if (activeCrops.length > 0) {
            const diff = 100 - totalAlloc;
            activeCrops[0].allocation_percent += diff;
        }

        let totalExpectedProfit = 0;
        activeCrops.forEach(c => {
            c.allocated_acres = currentPlanData.land_size * (c.allocation_percent / 100);
            c.total_expected_profit = c.profit_per_acre * c.allocated_acres;
            totalExpectedProfit += c.total_expected_profit;
        });

        // 2. Render Summary
        if (activeCrops.length > 0) {
            totalProfitEl.textContent = formatCurrency(totalExpectedProfit);
            landUtilEl.textContent = `${currentPlanData.land_size} Acres`;
        } else {
            totalProfitEl.textContent = "₹0";
            landUtilEl.textContent = "No crops selected";
        }

        // 3. Render Crop Cards (All originally returned crops, active styled differently)
        cropCardsContainer.innerHTML = '';
        let gridConfig = [];
        let colorIndex = 0;

        // Create a sorted list based on 3 strictly separated tiers:
        // Tier 1: Active crops (added to dashboard)
        // Tier 2: Selectable inactive crops (passed filters, but user hasn't added them yet)
        // Tier 3: Unselectable crops (failed hard filters, disabled UI)

        let tier1Active = currentPlanData.crops.filter(c => currentActiveCropNames.has(c.name));
        let tier2Selectable = currentPlanData.crops.filter(c => !currentActiveCropNames.has(c.name) && c.selectable !== false);
        let tier3Unselectable = currentPlanData.crops.filter(c => !currentActiveCropNames.has(c.name) && c.selectable === false);

        const sortedCropsForDisplay = [...tier1Active, ...tier2Selectable, ...tier3Unselectable];

        sortedCropsForDisplay.forEach(crop => {
            const isActive = currentActiveCropNames.has(crop.name);
            let color = '#ccc'; // Inactive background
            let cardHTML = '';

            if (isActive) {
                // Find matching active crop for computed stats
                const activeData = activeCrops.find(c => c.name === crop.name);
                color = cropColors[colorIndex % cropColors.length];
                colorIndex++;

                gridConfig.push({
                    name: activeData.name,
                    percent: activeData.allocation_percent,
                    color: color
                });

                cardHTML = `
                    <div class="crop-card active-card" data-crop-name="${activeData.name}" style="border-left-color: ${color}; cursor: pointer; position: relative;">
                        <div style="position: absolute; top: 10px; right: 10px; color: var(--success); font-weight: bold; font-size: 0.8rem;">✓ Added</div>
                        <div class="crop-header" style="margin-bottom: 0.5rem">
                            <span class="crop-name">${activeData.name}</span>
                            <span class="crop-badge">${activeData.allocation_percent}% Allocation</span>
                        </div>
                        <div class="crop-metrics">
                            <div class="metric">
                                <span class="metric-label">Allocated Land</span>
                                <span class="metric-value">${activeData.allocated_acres.toFixed(2)} Acres</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Expected Profit</span>
                                <span class="metric-value" style="color: var(--primary-color)">${formatCurrency(activeData.total_expected_profit)}</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Yield per Acre</span>
                                <span class="metric-value">${activeData.yield_per_acre} Quintals</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Crop Duration</span>
                                <span class="metric-value">${activeData.duration_days} Days</span>
                            </div>
                            <div class="metric" style="grid-column: 1 / -1;">
                                <span class="metric-label">Recommended Fertilizers</span>
                                <span class="metric-value" style="font-size: 0.9rem; color: #475569;">${crop.best_fertilizers || 'Organics / NPK Base'}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {

                if (crop.selectable === false) {
                    let reasonsListHTML = '';
                    if (crop.unselectable_reasons && crop.unselectable_reasons.length > 0) {
                        const reasonsItems = crop.unselectable_reasons.map(r => `<li>${r}</li>`).join('');
                        reasonsListHTML = `
                            <div style="background: #fee2e2; border-left: 3px solid #ef4444; padding: 0.5rem; margin-top: 0.8rem; font-size: 0.8rem; color: #b91c1c; border-radius: 4px;">
                                <strong style="display: block; margin-bottom: 0.3rem;">Cannot be selected due to:</strong>
                                <ul style="margin: 0; padding-left: 1.2rem;">
                                    ${reasonsItems}
                                </ul>
                            </div>
                        `;
                    }

                    cardHTML = `
                        <div class="crop-card inactive-card" style="border-left-color: #94a3b8; opacity: 0.8; padding: 1rem; cursor: not-allowed; filter: grayscale(80%); background-color: #f8fafc;">
                            <div class="crop-header" style="margin-bottom: 0.5rem; padding-bottom: 0;">
                                <span class="crop-name" style="font-size: 1.1rem; text-decoration: line-through; color: #64748b;">${crop.name}</span>
                                <span class="crop-badge" style="background: #cbd5e1; color: #475569;">${crop.unselectable_reasons && crop.unselectable_reasons.length > 1 ? 'Multiple Mismatches' : 'Mismatched'}</span>
                            </div>
                            <div class="crop-metrics" style="grid-template-columns: 1fr; gap: 0.2rem;">
                                <div class="metric" style="flex-direction: row; justify-content: space-between;">
                                    <span class="metric-label">Yield/Acre</span>
                                    <span class="metric-value" style="font-size: 0.9rem">${crop.yield_per_acre} Qntl</span>
                                </div>
                                <div class="metric" style="flex-direction: row; justify-content: space-between;">
                                    <span class="metric-label">Profit/Acre</span>
                                    <span class="metric-value" style="font-size: 0.9rem">${formatCurrency(crop.profit_per_acre)}</span>
                                </div>
                                <div class="metric" style="flex-direction: column; justify-content: flex-start; margin-top: 0.2rem;">
                                    <span class="metric-label">Recommended Fertilizers</span>
                                    <span class="metric-value" style="font-size: 0.8rem; color: #475569;">${crop.best_fertilizers || 'Organics / NPK Base'}</span>
                                </div>
                            </div>
                            ${reasonsListHTML}
                        </div>
                    `;
                } else {
                    cardHTML = `
                        <div class="crop-card inactive-card" data-crop-name="${crop.name}" style="border-left-color: #cbd5e1; opacity: 0.6; padding: 1rem; cursor: pointer; filter: grayscale(100%); transition: filter 0.2s, opacity 0.2s;">
                            <style>
                                .inactive-card:hover { filter: grayscale(0%); opacity: 1 !important; transform: none; box-shadow: var(--shadow-soft); }
                            </style>
                            <div class="crop-header" style="margin-bottom: 0.5rem; padding-bottom: 0;">
                                <span class="crop-name" style="font-size: 1.1rem">${crop.name}</span>
                                <span class="crop-badge" style="background: #e2e8f0; color: #718096; cursor: pointer">+ Add</span>
                            </div>
                            <div class="crop-metrics" style="grid-template-columns: 1fr; gap: 0.2rem;">
                                <div class="metric" style="flex-direction: row; justify-content: space-between;">
                                    <span class="metric-label">Yield/Acre</span>
                                    <span class="metric-value" style="font-size: 0.9rem">${crop.yield_per_acre} Qntl</span>
                                </div>
                                <div class="metric" style="flex-direction: row; justify-content: space-between;">
                                    <span class="metric-label">Profit/Acre</span>
                                    <span class="metric-value" style="font-size: 0.9rem">${formatCurrency(crop.profit_per_acre)}</span>
                                </div>
                                <div class="metric" style="flex-direction: column; justify-content: flex-start; margin-top: 0.2rem;">
                                    <span class="metric-label">Recommended Fertilizers</span>
                                    <span class="metric-value" style="font-size: 0.8rem; color: #475569;">${crop.best_fertilizers || 'Organics / NPK Base'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            cropCardsContainer.insertAdjacentHTML('beforeend', cardHTML);
        });

        // 4. Render Visual Grid
        renderVisualGrid(gridConfig);

        // 5. Render Farming Calendar
        const timelineEl = document.getElementById('calendar-timeline');
        if (timelineEl) {
            timelineEl.innerHTML = '';
            let allEvents = [];
            activeCrops.forEach(crop => {
                if (crop.allocation_percent > 0 && crop.calendar) {
                    allEvents.push(...crop.calendar);
                }
            });

            allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

            if (allEvents.length > 0) {
                // We use dataset properties to keep track of state dynamically
                allEvents.forEach((evt, idx) => {
                    const typeClass = evt.type === 'fertilization' ? 'fertilization' : '';
                    const evtDate = new Date(evt.date);

                    const evtHtml = `
                        <div class="timeline-item ${typeClass}" id="timeline-event-${idx}" data-orig-date="${evt.date}" data-current-date="${evt.date}" data-index="${idx}" data-crop-name="${evt.crop}" data-task-type="${typeClass}">
                            <div class="timeline-date" id="timeline-date-${idx}">${evtDate.toDateString()}</div>
                            <div class="timeline-title">${evt.title}</div>
                            
                            <div class="timeline-controls">
                                <label class="timeline-checkbox">
                                    <input type="checkbox" class="event-done-chk" data-target="timeline-event-${idx}">
                                    Mark as Done
                                </label>
                                <button type="button" class="btn-missed" data-target="timeline-event-${idx}" data-index="${idx}">Task Missed (+2 Days)</button>
                            </div>
                        </div>
                    `;
                    timelineEl.insertAdjacentHTML('beforeend', evtHtml);
                });

                // Attach Event Listeners for new timeline interactive elements
                attachTimelineInteractions(allEvents);

            } else {
                timelineEl.innerHTML = '<p style="color: var(--text-muted)">No schedule available for these crops (select a crop first).</p>';
            }
        }
    }

    function attachTimelineInteractions(allEvents) {
        // Handle "Mark as Done" checkboxes
        document.querySelectorAll('.event-done-chk').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const targetId = e.target.dataset.target;
                const timelineItem = document.getElementById(targetId);
                const missedBtn = timelineItem.querySelector('.btn-missed');

                if (e.target.checked) {
                    timelineItem.classList.add('done');
                    missedBtn.style.display = 'none'; // hide missed button if done
                } else {
                    timelineItem.classList.remove('done');
                    missedBtn.style.display = 'inline-block';
                }
            });
        });

        // Handle "Task Missed" buttons (pushes this date and all SUBSEQUENT dates back by 2 days)
        document.querySelectorAll('.btn-missed').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.dataset.target;
                const index = parseInt(e.target.dataset.index, 10);
                const timelineItem = document.getElementById(targetId);

                // Add rescheduled visual flair to clicked item
                timelineItem.classList.add('rescheduled');

                // Extract the specific crop and task type of the missed event
                const missedCropName = timelineItem.dataset.cropName;
                const missedTaskType = timelineItem.dataset.taskType;

                // For this item and all SUBSEQUENT matching items, push date forward by 2 days visually
                for (let i = index; i < allEvents.length; i++) {
                    const itemEl = document.getElementById(`timeline-event-${i}`);
                    const dateEl = document.getElementById(`timeline-date-${i}`);

                    if (itemEl && dateEl) {
                        // Strict Matching: Only shift if the crop AND the general task type match
                        if (itemEl.dataset.cropName === missedCropName && itemEl.dataset.taskType === missedTaskType) {
                            let currentDate = new Date(itemEl.dataset.currentDate);
                            currentDate.setDate(currentDate.getDate() + 2); // add 2 days

                            // Update tracking dataset
                            itemEl.dataset.currentDate = currentDate.toISOString();

                            // Update visual date text
                            let dateHtml = currentDate.toDateString();
                            if (i === index) {
                                dateHtml += ' <span class="rescheduled-badge">Rescheduled</span>';
                            }
                            dateEl.innerHTML = dateHtml;
                        }
                    }
                }

                // Disable the button after one use to prevent spamming
                e.target.disabled = true;
                e.target.textContent = "Rescheduled";
                e.target.style.opacity = "0.5";
                e.target.style.cursor = "not-allowed";
            });
        });
    }

    function renderVisualGrid(gridConfig) {
        visualGrid.innerHTML = '';
        gridLegend.innerHTML = '';

        let cellsRendered = 0;

        gridConfig.forEach(crop => {
            // Render Legend Item
            const legendHTML = `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${crop.color}"></div>
                    <span>${crop.name} (${crop.percent}%)</span>
                </div>
            `;
            gridLegend.insertAdjacentHTML('beforeend', legendHTML);

            // Calculate exact number of cells out of 100
            const numCells = Math.round(crop.percent);

            // Render Cells sequentially to animate filling effect
            for (let i = 0; i < numCells && cellsRendered < 100; i++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                // Add slight staggered delay to make grid fill up nicely
                setTimeout(() => {
                    cell.style.backgroundColor = crop.color;
                }, cellsRendered * 10);

                visualGrid.appendChild(cell);
                cellsRendered++;
            }
        });

        // Fill any remaining empty cells (due to rounding) with the first crop color or gray
        while (cellsRendered < 100) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            const defaultColor = gridConfig[0] ? gridConfig[0].color : '#e2e8f0';
            setTimeout(() => {
                cell.style.backgroundColor = defaultColor;
            }, cellsRendered * 10);
            visualGrid.appendChild(cell);
            cellsRendered++;
        }
    }
});