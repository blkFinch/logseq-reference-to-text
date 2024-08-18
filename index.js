import '@logseq/libs';

//Inputs 5 numbered blocks when called
async function raferencesToText(e) {
  const currentPage = await logseq.Editor.getCurrentPage();
  console.log('currentPage', currentPage);

  // Extract the filters property
  const filtersString = JSON.stringify(currentPage.properties.filters);
  const correctedString = correctJsonString(filtersString);
  console.log('corrected string', correctedString);

  //need to double parse because the string is double stringified above
  // see: https://stackoverflow.com/questions/42494823/json-parse-returns-string-instead-of-object
  const filtersObject = JSON.parse(JSON.parse(correctedString));

  console.log('object', filtersObject);
  console.log('object type', typeof filtersObject);
  // console.log('object properties', Object.entries(filtersObject));

  const refs = await logseq.Editor.getPageLinkedReferences(currentPage.originalName);

  const sortedRefs = refs.sort((a, b) => {
    // Get the journalDay for comparison, default to -1 if not present
    const journalDayA = a['0']?.journalDay ?? -1;
    const journalDayB = b['0']?.journalDay ?? -1;

    return journalDayA - journalDayB;
  });

  console.log('sorted data', sortedRefs);

  // Convert the filtersObject to arrays of names with true and false values
  const trueFilters = [];
  const falseFilters = [];

  for (const [name, value] of Object.entries(filtersObject)) {
    if (value) {
      trueFilters.push(name);
    } else {
      falseFilters.push(name);
    }
  }

  const filteredData = sortedRefs.filter((item) => {
    const itemName = item[0].name; // Extract the name from the sortedData
    if (falseFilters.includes(itemName)) {
      return false; // Exclude items with names in falseFilters
    }
    if (trueFilters.length === 0) {
      return true; // If no true filters, include all
    }
    return trueFilters.includes(itemName); // Include items with names in trueFilters
  });

  console.log('filtered Data', filteredData);
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
  logseq.Editor.registerSlashCommand('printReferences', async (e) => {
    raferencesToText(e);
  });
};

logseq.ready(main).catch(console.error);
