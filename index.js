import '@logseq/libs';

// TODO: clean up and comment this logic for filtering results
// TODO: print the blocks to the page
// TODO: create a new page for the exported refs and print blocks there

//Inputs 5 numbered blocks when called
async function raferencesToText(e) {
  const currentPage = await logseq.Editor.getCurrentPage();
  console.log('currentPage', currentPage);

  const [includeFilter, excludeFilter] = returnTrueAndFalseFilters(currentPage);
  console.log('includeFilter', includeFilter);
  console.log('excludeFilter', excludeFilter);
  const refs = await logseq.Editor.getPageLinkedReferences(currentPage.name);

  //sorts by the journalDay property otherwise sort to bottom for non journal pages
  const sortedRefs = refs.sort((a, b) => {
    const journalDayA = a['0']?.journalDay ?? -1;
    const journalDayB = b['0']?.journalDay ?? -1;

    return journalDayA - journalDayB;
  });

  console.log('sorted data', sortedRefs);

  const filteredData = sortedRefs.filter((item) => {
    const itemName = item[0].name; // Extract the name from the sortedData
    if (excludeFilter.includes(itemName)) {
      return false; // Exclude items with names in falseFilters
    }
    if (includeFilter.length === 0) {
      return true; // If no true filters, include all
    }
    return includeFilter.includes(itemName); // Include items with names in trueFilters
  });

  console.log('filtered Data', filteredData);

  filteredData.forEach(async (note) => {
    const block = await logseq.Editor.appendBlockInPage(currentPage.name, note[0].originalName)
    logseq.Editor.insertBatchBlock(block.uuid, note[1]);
  });
}


function returnTrueAndFalseFilters(page) {
  const trueFilters = [];
  const falseFilters = [];

  const hasFilters = !!page.properties?.filters;
  console.log('hasFilters', hasFilters);
  if (!hasFilters) {
    return [trueFilters, falseFilters];
  }
  // Extract the filters property
  const filters = page.properties?.filters || '{}';
  const correctedString = correctJsonString(filters);
  console.log('corrected string', correctedString);

  //need to double parse because the string is double stringified above
  // see: https://stackoverflow.com/questions/42494823/json-parse-returns-string-instead-of-object
  const filtersObject = JSON.parse(JSON.parse(correctedString));

  console.log('object', filtersObject);
  console.log('object type', typeof filtersObject);
  // console.log('object properties', Object.entries(filtersObject));

  for (const [name, value] of Object.entries(filtersObject)) {
    if (value) {
      trueFilters.push(name);
    } else {
      falseFilters.push(name);
    }
  }

  return [trueFilters, falseFilters];
}

function correctJsonString(jsonStr) {
  // This regex finds patterns where a key is not followed by a colon
  const correctedStr = jsonStr
    // Step 1: Add missing colons after keys
    .replace(/"(.*?)"(\s+)([^\{\}\[\],\s])/g, '"$1": $3')
    // Step 2: Handle values that are not properly formatted
    .replace(/":\s*([^\{\}\[\],\s]+)(?=\s*[\}\],])/g, '": $1')
    // Step 3: Ensure boolean and null values are correctly formatted
    .replace(/":\s*(true|false|null)(?=\s*[\}\],])/g, '": $1');

  return correctedStr;
}

const main = async () => {
  console.log('PageRefToText loaded!');
  logseq.Editor.registerSlashCommand('export references', async (e) => {
    raferencesToText(e);
  });
};

logseq.ready(main).catch(console.error);
