function Manager()
{
    this.help = new Help();
    this.search = new Search(this);

    this.tabReference = document.querySelector('#tabs');
    this.tabArray = this.generateList();

    this.activeTab = -1;
    this.selectedTab = -1;

    this.tabLock = false;
    this.movementMode = false; //Used for determining if user dragging list or wants to open tab

    this.help.show();

    //Mouse drag movement
    var dragStarted = false;
    var currentY;
    var offsetY;

    this.tabReference.addEventListener('mousedown', function(e) {
        currentY = e.clientY;
        dragStarted = true;
    }.bind(this));

    this.tabReference.addEventListener('mouseup', function(e) {
        dragStarted = false;
        this.movementMode = false;
    }.bind(this));

    this.tabReference.addEventListener('mousemove', function(e) {
        if (dragStarted) {
            e.preventDefault();

            this.movementMode = true;

            offsetY = e.clientY - currentY;
            currentY = e.clientY;

            window.scrollTo(0, window.pageYOffset - offsetY);
        }
    }.bind(this));

    //Catch keypress and focus input if not focused
    window.addEventListener('keydown', function(e) {
        if (this.search.searchInputReference !== document.activeElement && this.search.isValidSearchChar(e)) {
            this.search.searchInputReference.focus();
            this.search.searchInputKeyup(e, this.tabArray);
        }
    }.bind(this));

    // Block up and down arrows in search box to prevent repositioning of carret to beginning/end
    this.search.searchInputReference.addEventListener('keydown', function(e) {
        keyCode = e.keyCode;

        if(
            keyCode == 38 ||					   //Up
            keyCode == 40   					   //Down
        ){
            e.preventDefault();
        }
    }.bind(this));
    
    //User pressed a key in the search box
    this.search.searchInputReference.addEventListener('keyup', function(e) {
        if(this.search.isValidSearchChar(e)) {
            this.search.searchInputKeyup(e, this.tabArray);
        }
    }.bind(this));

    //User clicked the clear search button
    this.search.searchClearReference.addEventListener('mousedown', function(e) {
        this.search.clear(this.tabArray);
    }.bind(this));
}
	
Manager.prototype.generateList = function()
{
	var tabArray = [];
	chrome.tabs.query({}, function(tabs) {
		for(var i=0; i<tabs.length; i++) {
            //Create an object for each tab
            var tab = new Tab(tabs[i].id, tabs[i].windowId, tabs[i].title, tabs[i].url, tabs[i].active, tabs[i].favIconUrl, this);

            // remember current active tab
            if(tab.active) this.activeTab = i;

            //Add the object to the tab array
			tabArray.push(tab);
			//Add to the tabs view
			this.tabReference.appendChild(tab.view);
		}

        // scroll tabs list to active tab
        if (this.activeTab != -1) this.centerOnTab(this.activeTab)
    }.bind(this));

	return tabArray;
};

Manager.prototype.centerOnTab = function(tabId)
{
    var tab = this.tabArray[tabId];
    console.log('centering on tab: ', tab.title);
    tab.scrollIntoView();
    this.tabLock = false;
    this.setSelectedTab(tab.id);
    this.updateSelectedTab();
    this.tabLock = true;
}

Manager.prototype.setSelectedTab = function(tabId)
{
    if (!this.tabLock) {

        var i = 0;
        while (i < this.tabArray.length) {
            if (this.tabArray[i].id == tabId) {
                this.selectedTab = i;
                break;
            }
            i++;
        }
    }
};

Manager.prototype.resetSelectedTab = function() // TODO: this is possible un-used function. May be should remove it.
{
    if (!this.tabLock) {
        this.selectedTab = -1;
    }
};

Manager.prototype.moveSelectedTab = function(down)
{
    var visibleTabs = [];
    var currentTab = -1;

    for(var i=0; i<this.tabArray.length; i++) {
        if(this.tabArray[i].isVisible)
            visibleTabs.push(i);

        if(this.selectedTab == i)
            currentTab = visibleTabs.length - 1;
    }

    if (down) {
        this.selectedTab = visibleTabs[Math.min(visibleTabs.length - 1, currentTab + 1)];
    } else {
        this.selectedTab = visibleTabs[Math.max(0, currentTab-1)];
    }

    // scroll to selected tab if its off-window
    this.tabArray[this.selectedTab].scrollIntoView(false);
    // scroll to top of window(to show search box) if first tab selected
    if (!down && this.selectedTab == 0) window.scrollTo(0, 0);

    this.updateViewOffset();
    this.updateSelectedTab();
    this.tabLock = true;
};

Manager.prototype.updateViewOffset = function()
{
    var top = document.body.scrollTop;
    var bottom = top + window.innerHeight;

    var bounds = this.tabArray[this.selectedTab].view.getBoundingClientRect();
    var tabTop = bounds.top + window.pageYOffset - document.documentElement.clientTop;
    var tabBottom = bounds.bottom + window.pageYOffset - document.documentElement.clientTop;
    var moveDistance = tabBottom - tabTop;

    if (tabTop - top < moveDistance * 2) {
        document.body.scrollTop -= moveDistance;
    }

    if (bottom - tabBottom < moveDistance * 2) {
        document.body.scrollTop += moveDistance;
    }
};

Manager.prototype.updateSelectedTab = function()
{
    for(var i=0; i<this.tabArray.length; i++) {
        if (i == this.selectedTab)
            this.tabArray[i].view.classList.add('tabSelected');
        else
            this.tabArray[i].view.classList.remove('tabSelected');
    }
};

Manager.prototype.switchToSelectedTab = function()
{
    this.tabArray[this.selectedTab].switchTo();
};

Manager.prototype.selectFirstTab = function()
{
    for(var i=0; i<this.tabArray.length; i++) {
        if (this.tabArray[i].isVisible) {
            this.selectedTab = i;
            this.updateSelectedTab();
            break;
        }
    }
};

window.onload = function()
{
    document.onmousemove = function() {
        tabManager.tabLock = false;
    };

	document.oncontextmenu = function(e) {
        e.preventDefault();
    };

    document.onkeydown = function(e) {
        switch (e.keyCode) {
            case 37:
            case 38:
                tabManager.moveSelectedTab(false);
                e.preventDefault();
                break;
            case 39:
            case 40:
                tabManager.moveSelectedTab(true);
                e.preventDefault();
                break;
            case 13:
                tabManager.switchToSelectedTab();
                break;
            case 27:
                window.close();
                break;
        }
    };

    if (typeof localStorage['popup.width'] == 'undefined') {
        document.body.style.width = '400px';
    } else {
        document.body.style.width = localStorage['popup.width'] * 200 + 'px';
    }

	var tabManager = new Manager();
};