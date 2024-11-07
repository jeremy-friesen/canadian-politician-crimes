// google sheet url
const sheetId = '1gof45QUi2p0f8YVaKa2fOgtIUBElSueh';
const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

// map party name to colour value
var partyColours = {};
// map names to data object
var politicians = {};
// map names to picture url and source
var pics = {};
// store original list order to undo sorting
let originalOrder = [];
// default sort direction
let sortDirection = 'neutral';

// default chart colours
const defaultColours = [
    'rgba(255, 99, 132, 0.6)',
    'rgba(54, 162, 235, 0.6)',
    'rgba(255, 206, 86, 0.6)',
    'rgba(75, 192, 192, 0.6)',
    'rgba(153, 102, 255, 0.6)',
    'rgba(255, 159, 64, 0.6)'
];

fetch('data/pics.txt')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(data => {
        const rows = data.split('\n');

        rows.forEach(row => {
            if (row.trim()) {
                const columns = row.split(',');
                pics[columns[0]] = 'pics/' + columns[1]
            }
        });
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });

fetch('data/party-colours.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        partyColours = data;
        console.log('party colours: ', partyColours);
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation for party colours:', error);
    });

// takes party column text and returns list of relevant parties 
function getPartyColours(partyText) {
    return Object.keys(partyColours)
        .filter(k => partyText.includes(k) && !(k === 'Independent'))
        .map(k => {
            partyText = partyText.replace(k, '');
            return partyColours[k];
        });
}

// takes party column text and returns list of relevant parties 
function fillParties(politician, partyText) {
    var keys = Object.keys(partyColours);
    politician['partyCategories'] = []
    var t = partyText;
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (t.includes(k)) {
            t = t.replace(k, '')
            politician['partyCategories'].push(k)
        }
    }
}

// data from google sheet
fetch(baseUrl)
    .then(response => response.text())
    .then(data => {
        console.log('google sheet data: ');
        console.log(data);

        const jsonData = JSON.parse(
            data.substr(47).slice(0, -2)
                .replace('Yellow = In Office', '')
        );
        const cols = jsonData.table.cols;
        const rows = jsonData.table.rows;

        // populate headers
        cols.forEach((col, index) => {
            const th = document.createElement('th');
            th.textContent = col.label;
            th.onclick = () => sortTable(index, th);
            document.getElementById('header-row').appendChild(th);
        });

        // populate rows
        rows.forEach(row => {
            const tr = document.createElement('tr');

            if (row.c[0] == null || row.c[0].v === '' || row.c[3] == null || row.c[3].v === '') {
                return;
            }

            var politician = {}
            row.c.forEach((cell, index) => {
                const td = document.createElement('td');

                if (cell)
                    politician[cols[index].label] = cell.v

                // source
                if (index === 7 && cell.v != null && (cell.v.includes('http://') || cell.v.includes('https://'))) {
                    var siteName = cell.v
                    siteName = siteName.replace('https://', '')
                        .replace('http://', '')
                        .replace('www.', '')
                        .split('/')[0];
                    const link = document.createElement('a');
                    link.href = cell.v;
                    link.textContent = siteName;
                    td.appendChild(link);
                }
                // time in office
                else if (index === 6) {
                    if (cell.v && cell.v.includes('Pres') || cell.v.includes('pres') || cell.v.includes('Current') || cell.v.includes('current')) {
                        td.style.backgroundColor = '#f9f977';
                    }
                    td.textContent = cell ? cell.v : '';
                }
                // crime
                else if (index === 3) {
                    td.style.fontWeight = 'bold';
                    td.textContent = cell ? cell.v : '';
                }
                // party
                else if (index === 2) {
                    // Get the party name
                    const partyName = cell ? cell.v.trim() : '';

                    // Set the background color based on the partyColours dictionary
                    const pColours = getPartyColours(partyName)
                    fillParties(politician, partyName)
                    const color = pColours[pColours.length - 1] || '#4c4c4c';
                    const textColour = getContrastingTextColor(color);

                    td.style.backgroundColor = color;
                    td.style.color = textColour;
                    td.style.fontWeight = 'bold';
                    td.textContent = cell ? cell.v : '';
                }
                // year of charge/conviction
                else if (index === 4) {
                    td.textContent = cell ? cell.v : '';
                }
                // politician name/picture
                else if (index === 0 && row.c[0]) {
                    // const imgCell = document.createElement('td');
                    const img = document.createElement('img');
                    var name = row.c[0].v
                    if (name) {
                        name = name.trim()
                    }
                    if (name && pics[name]) {
                        img.src = pics[name].trim();
                    }
                    else {
                        img.src = 'pics/no-image.jpg';
                    }
                    td.className = 'first-column';
                    td.textContent = cell ? cell.v : '';
                    td.style.fontWeight = 'bold';
                    td.appendChild(document.createElement('br'));
                    td.appendChild(img);
                }
                else {
                    td.textContent = cell ? cell.v : '';
                }
                tr.appendChild(td);
            });
            politicians[row.c[0].v] = politician
            document.getElementById('data-body').appendChild(tr);
        });

        createProvinceChart(politicians);
        createPartyChart(politicians);
    })
    .catch(error => console.error('Error fetching data:', error));

// search bar onkeyup behaviour
function filterTable() {
    const input = document.getElementById('search');
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll('#data-body tr');

    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        let rowVisible = false;

        for (let i = 0; i < cells.length; i++) {
            if (cells[i].textContent.toLowerCase().includes(filter)) {
                rowVisible = true;
                break;
            }
        }
        row.style.display = rowVisible ? '' : 'none';
    });
}

// on header click
function sortTable(columnIndex) {
    const table = document.getElementById('data-table');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const headerCells = table.querySelectorAll('thead th');

    if (originalOrder.length === 0) {
        originalOrder = rows.map(row => row.cloneNode(true));
    }

    // clear any existing arrows from header cells
    headerCells.forEach(cell => {
        cell.innerHTML = cell.innerHTML.replace(/ ▲| ▼/g, '');
    });

    // first click, sort ascending
    if (sortDirection === 'neutral') {
        sortDirection = 'asc';

        // second click, sort descending
    } else if (sortDirection === 'asc') {
        sortDirection = 'desc';

        // third click, revert to original order
    } else {
        sortDirection = 'neutral';
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        originalOrder.forEach(row => tbody.appendChild(row.cloneNode(true)));
        return;
    }

    // sort the rows based on the selected direction
    rows.sort((a, b) => {
        const cellA = a.cells[columnIndex].innerText.trim();
        const cellB = b.cells[columnIndex].innerText.trim();

        // sort numerically if both cells are numbers
        if (!isNaN(cellA) && !isNaN(cellB)) {
            return sortDirection === 'asc' ? cellA - cellB : cellB - cellA;

        } else { // alphabetically otherwise
            return sortDirection === 'asc' ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
        }
    });

    // clear the current rows and append the sorted rows
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));

    // add the appropriate arrow to the sorted column
    const arrow = sortDirection === 'asc' ? ' ▲' : ' ▼';
    headerCells[columnIndex].innerHTML += arrow;
}

// get black or white text color, whichever has better contrast for given background
function getContrastingTextColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function drawChart(tagId, labels, data, title, xlabel, colours = defaultColours, type = 'bar') {
    const ctx = document.getElementById(tagId).getContext('2d');
    var c = Array.from({ length: data.length }, (_, i) => colours[i % colours.length]);
    new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: c,
                borderColor: '#000000',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
                x: {
                    title: {
                        display: true,
                        text: xlabel
                    }
                }
            }
        }
    });
}

function createProvinceChart(data) {
    const provinceCounts = {};

    document.getElementById('charts').style.display = 'flex';

    // count crimes by province
    for (const politician in data) {
        const province = data[politician].Province;
        provinceCounts[province] = (provinceCounts[province] || 0) + 1;
    }

    // sort in descending order
    const sortedProvinces = Object.entries(provinceCounts)
        .sort((a, b) => b[1] - a[1]);

    const provinces = sortedProvinces.map(entry => entry[0]);
    const counts = sortedProvinces.map(entry => entry[1]);

    drawChart('provinceChart', provinces, counts, 'Crimes by Province or Territory', 'Province');
}

function createPartyChart(data) {
    const partyCounts = {};
    const partyColours = {};

    // count crimes by party
    for (const i in data) {
        politician = data[i];
        var party = politician['partyCategories'][politician['partyCategories'].length - 1];
        if (party == undefined) {
            party = 'N/A';
        }
        party = party.replace(' Party', '');
        var pc = getPartyColours(party);
        var c = pc[pc.length - 1];
        if (party === 'New Democratic') {
            party = 'NDP';
        }
        if (party == 'British Columbia Social Credit') {
            party = 'BC Social Credit';
        }
        partyColours[party] = c;
        partyCounts[party] = (partyCounts[party] || 0) + 1;
    }

    // sort in descending order
    const sortedParties = Object.entries(partyCounts)
        .sort((a, b) => b[1] - a[1]);

    const parties = sortedParties.map(entry => entry[0]);
    const counts = sortedParties.map(entry => entry[1]);
    const colours = sortedParties.map(entry => partyColours[entry[0]]);

    drawChart('partyChart', parties, counts, 'Crimes by Party', 'Party', colours);
}

function downloadCSV() {
    const rows = document.querySelectorAll('#data-table tr');
    let csvContent = Array.from(rows).map(row => {
        const cells = row.querySelectorAll('th, td');
        return Array.from(cells).map((cell, index) => {
            if (index === cells.length - 1) {
                const link = cell.querySelector('a');
                if (link)
                    return `"${link.href}"`;
            }
            return `"${cell.textContent.replace('\n', '').trim()}"`;
        }).join(',');
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'CanadaPoliticianCrimes.csv';
    link.click();
}

function downloadExcel() {
    const table = document.getElementById('data-table');

    const tableClone = table.cloneNode(true);
    const rows = Array.from(tableClone.rows);

    // loop through rows and replace last column's content link text
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const link = cells[cells.length - 1].querySelector('a');
        console.log('name: ' + cells[0].textContent);
        if (link) {
            cells[cells.length - 1].textContent = link.href;
        }
        console.log(cells[cells.length - 1].textContent)
        cells[0].textContent = cells[0].textContent.replace('\n', '').trim()
    });

    // convert table to an array of data
    const data = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => cell.textContent.toString());
    });

    // create a worksheet from the data array
    const ws = XLSX.utils.aoa_to_sheet(data);

    // create a workbook with the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    const excelFile = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([excelFile], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'CanadaPoliticianCrimes.xlsx';
    link.click();
}

async function downloadPDF(includePictures) {
    const tableData = document.querySelectorAll('#data-table tr');
    const rows = [];

    for (const row of tableData) {
        const cells = row.querySelectorAll('th, td');

        const rowData = await Promise.all(Array.from(cells).map(async (cell, index) => {
            // name column with image
            if (index === 0 && includePictures) {
                const img = cell.querySelector('img');
                if (img) {
                    try {
                        const base64Image = await getBase64ImageFromURL(img.src);

                        if (base64Image) {
                            return {
                                stack: [
                                    {
                                        text: cell.textContent.trim(),
                                    },
                                    {
                                        image: base64Image,
                                        width: 50
                                    }
                                ],
                            };
                        }
                    } catch (error) {
                        console.error("Error converting image to Base64:", error);
                        return { text: "Image Error" };
                    }
                }
            }

            // source column with a hyperlink
            const link = cell.querySelector('a');
            if (link) {
                return { text: link.textContent.trim(), link: link.href };
            }

            return cell.textContent.trim();
        }));
        rows.push(rowData);
    };

    const docDefinition = {
        content: [
            { text: 'Crimes by Canadian Politicians', fontSize: 18, bold: true, margin: [0, 0, 0, 0] },
            {
                table: {
                    body: rows
                },
                layout: 'auto'
            }
        ],
        pageMargins: [0, 0, 0, 0],
    };

    pdfMake.createPdf(docDefinition).download('CanadaPoliticianCrimes.pdf');
}

function getBase64ImageFromURL(url) {
    return new Promise((resolve, reject) => {
        var img = new Image();
        img.setAttribute("crossOrigin", "anonymous");

        img.onload = () => {
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            var dataURL = canvas.toDataURL("image/png");

            resolve(dataURL);
        };

        img.onerror = error => {
            reject(error);
        };

        img.src = url;
    });
}