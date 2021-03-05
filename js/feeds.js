function createRssHtml(rssFeed) {
  return `
  <div class="item">
    <div class="middle aligned content">
      <div class="header">
        <div class="ui label rssfeed-id">${rssFeed.id}</div>
        <a>${rssFeed.name}</a>
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
    "id": new Date().getTime(),
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