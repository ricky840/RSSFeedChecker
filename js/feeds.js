function createRssHtml(rssFeed) {
  return `
  <div class="item">
    <div class="middle aligned content">
      <div class="header">
        <a>${rssFeed.name}</a>
        <div class="ui label rssfeed-id">${rssFeed.id}</div>
      </div>
			<div class="meta">
				<span>Last Updated: ${rssFeed.lastUpdated} </span>
			</div
      <div class="description">
        <span>URL: <a href="${rssFeed.url}" target="_blank">${rssFeed.url}</a></span>
      </div
      <div class="extra">
        <div class="ui right floated button rss-feed-delete-btn">Delete</div>
      </div
    </div>
  </div>`;
}

async function loadRssFeeds() {
  const rssList = await loadRssList();
  if (_.isEmpty(rssList)) {
    return;
  }

  $(".rss-feeds-wrapper").find('.rss-feeds').empty();
  rssList.forEach((rss) => {
    const html = createRssHtml(rss);
    $(".rss-feeds-wrapper").find('.rss-feeds').append(html);
  });
}

const isValidUrl = (url) => {
  try {
    const obj = new URL(url);
    return obj.toString();
  } catch (e) {
    return false;
  }
};

$(".content-wrapper").on("click", ".rss-feed-delete-btn", async function(event) { 
  const feedId = $(event.target).closest(".item").find(".rssfeed-id").html();
  const rssList = await loadRssList();
  rssList.forEach((eachRss, index) => {
    if (eachRss.id == feedId) {
      rssList.splice(index, 1)
    }
  });
  chrome.storage.local.set({ "rssList" : rssList }, function() { 
    $(event.target).closest(".item").remove();
  })
});

$(".content-wrapper").on("click", ".rss-feeds-new-btn", async function() {
  const nameInput = $(".rss-feeds-new-name").find("input");
  const urlInput = $(".rss-feeds-new-url").find("input");
  const name = nameInput.val().trim();
  const rssUrl = urlInput.val().trim();

  if (_.isEmpty(name)) {
    nameInput.closest("div").addClass("error");
    setTimeout(function () { 
      nameInput.closest("div").removeClass("error");
    }, 200);
    return;
  }

  if (!isValidUrl(rssUrl)) {
    urlInput.closest("div").addClass("error");
    setTimeout(function () { 
      urlInput.closest("div").removeClass("error");
    }, 200);
    return;
  }

  // add it to the db and refresh page
  const rssFeed = {
    "id": uuidv4(),
    "name": name,
    "url": rssUrl,
    "lastUpdated": null,
    "latestContents": []
  }
  const rssList = await loadRssList();
  rssList.push(rssFeed);

  chrome.storage.local.set({ "rssList" : rssList }, function() { 
    const html = createRssHtml(rssFeed);
    $(".rss-feeds-wrapper").find('.rss-feeds').prepend(html);
  });
});

// Save keyword button
$(".content-wrapper").on("click", ".rss-keywords-new-btn", function(event) {
  const inputKeywords = tagify.value;
  let stringKeywords = [];
  inputKeywords.forEach((each) => {
    if (!_.isEmpty(each.value)) stringKeywords.push(each.value);
  });
  chrome.storage.local.set({ "keywords" : stringKeywords }, () => { 
    $(this).html("Saved!");
    setInterval(() => {
      $(this).html("Save");
    }, 1000);
  });
});

// Export button
$(".content-wrapper").on("click", ".rss-feeds-export-btn", async function(event) {
  const rssList = await loadRssList();
  let exportData = [];
  rssList.forEach((rss) => {
    exportData.push({
      "RSSFeed Name": rss.name,
      "URL": rss.url
    }); 
  });
  let exportCsv = Papa.unparse(exportData);
  let hiddenElement = document.createElement('a');
  const universalBOM = "\uFEFF";
  hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(universalBOM + exportCsv);
  hiddenElement.target = '_blank';
  hiddenElement.download = "rssList.csv";
  hiddenElement.click();
});

// File upload
$(".content-wrapper").on("click", ".rss-feeds-import-btn", async function(event) {
	$('input[type="file"]').trigger("click");
});

// Import button
$('.content-wrapper').on('change', 'input[type="file"]', function() {
	const file = $(this).prop('files')[0];
	if (file == undefined) return;
	$(this).val(""); // Reset file

  Papa.parse(file, {
    config: { comments: true, skipEmptyLines: true },
    complete: function(results) {
      let importedData = results.data;
      // See if it is in the right format first
      importedDataFirstRow = importedData[0];
      let isRightFormat = true;
      if (importedDataFirstRow[0] != "RSSFeed Name") isRightFormat = false;
      if (importedDataFirstRow[1] != "URL") isRightFormat = false;
      if (!isRightFormat) {
        notificationManager.show({
          "header": `CSV is not in the right format`,
          "content": `Please make sure it includes "RSSFeed Name" and "URL" column in the first line`
        }, "negative");
        return false;
      }

      // Remove the title first row
      importedData.shift();

      // Save into database
      let newRssList = [];
      importedData.forEach((data, index) => {
        const name = data[0].trim();
        const url = data[1].trim();
        
        // Make sure it has the valid URL
        if (!isValidUrl(url)) {
          notificationManager.show({
            "header": `CSV Parse Error at line ${index + 2}`,
            "content": `URL: "${url}" is not in the right format.`
          }, "negative");
          return false;
        }

        // See if name is empty
        if (_.isEmpty(name)) {
          notificationManager.show({
            "header": `CSV Parse Error at line ${index + 2}`,
            "content": `Name field is empty`
          }, "negative");
          return false;
        }

        newRssList.push({
          "id": uuidv4(),
          "name": name,
          "url": url,
          "lastUpdated": null,
          "latestContents": []
        });
      });
  
      chrome.storage.local.set({ "rssList" : newRssList }, function() { 
        notificationManager.show({
          "header": `Successfully Imported`,
          "content": `:)`
        }, "positive"); 
        loadRssFeeds();
      });
    }
  });
});