const sheetId = '1gof45QUi2p0f8YVaKa2fOgtIUBElSueh'; // Replace with your actual sheet ID
const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

var partyColours = {};
var politicians = {};
var pics = {};

// Function to load the pics.txt file
fetch('pics.txt')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(data => {
        const rows = data.split('\n');
        // const tableBody = document.querySelector('#pics-table tbody');

        rows.forEach(row => {
            if (row.trim()) {
                const columns = row.split(',');
                pics[columns[0]] = "pics/" + columns[1]
                // tableBody.appendChild(newRow);
            }
        });
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });


fetch("party-colours.json")
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        partyColours = data;
        console.log(partyColours);
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation for party colours:', error);
    });

function getPartyColours(politician, partyText) {
    var keys = Object.keys(partyColours);
    var pColours = [];
    politician["partyCategories"] = []
    var t = partyText;
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (t.includes(k) && !(k == "Independent" && pColours.length > 0)) {
            pColours.push(partyColours[k]);
            t = t.replace(k, '')
            politician["partyCategories"].push(k)
        }
    }
    return pColours;
}

function getPartyColours2(partyText) {
    var keys = Object.keys(partyColours);
    var pColours = [];
    var t = partyText;
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (t.includes(k) && !(k == "Independent" && pColours.length > 0)) {
            pColours.push(partyColours[k]);
            t = t.replace(k, '')
        }
    }
    return pColours;
}

fetch(baseUrl)
    .then(response => response.text())
    .then(data => {
        const jsonData = JSON.parse(
            data.substr(47).slice(0, -2)
                .replace('Yellow = In Office', '')
        );
        const cols = jsonData.table.cols;
        const rows = jsonData.table.rows;

        // Populate headers
        cols.forEach((col, index) => {
            const th = document.createElement('th');
            th.textContent = col.label;
            th.onclick = () => sortTable(index, th);
            document.getElementById('header-row').appendChild(th);
        });

        // Populate rows
        rows.forEach(row => {
            const tr = document.createElement('tr');

            if (row.c[2])
                console.log(row.c[2].v)

            if (row.c[0] == null || row.c[0].v === "" || row.c[3] == null || row.c[3].v === "") {
                return;
            }

            var politician = {}
            row.c.forEach((cell, index) => {
                const td = document.createElement('td');

                if (cell)
                    politician[cols[index].label] = cell.v

                // Get the party name
                const partyName = row.c[2] ? row.c[2].v.trim() : "";

                const pColours = getPartyColours(politician, partyName)
                // Set the background color based on the partyColours dictionary
                const color = pColours[pColours.length - 1] || "#cecccc"; // Default to white if not found

                // col 7 is source
                if (index === 7 && cell.v != null && (cell.v.includes('http://') || cell.v.includes('https://'))) {
                    var siteName = cell.v
                    siteName = siteName.replace('https://', '')
                        .replace('http://', '')
                        .replace('www.', '')
                        .split('/')[0];
                    const link = document.createElement('a');
                    link.href = cell.v;
                    // link.target = "_blank";
                    link.textContent = siteName;
                    //.charAt(0).toUpperCase() + siteName.slice(1); // Capitalize the first letter
                    td.appendChild(link);
                }
                else if (index === 3) {
                    td.style.fontWeight = "bold";
                    td.textContent = cell ? cell.v : '';
                }
                else if (index === 2) {
                    td.style.backgroundColor = color;
                    td.textContent = cell ? cell.v : '';
                }
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
                    td.appendChild(document.createElement('br'));
                    td.appendChild(img);
                    // newRow.appendChild(imgCell);
                }
                else {
                    td.textContent = cell ? cell.v : '';
                }
                tr.appendChild(td);
                // whole row party colour
                // tr.style.backgroundColor = color;
            });
            politicians[row.c[0].v] = politician
            document.getElementById('data-body').appendChild(tr);
        });

        createProvinceChart(politicians);
        createPartyChart(politicians);
    })
    .catch(error => console.error('Error fetching data:', error));

console.log(politicians)


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

function sortTable(colIndex, th) {
    const table = document.getElementById('data-table');
    const tbody = document.getElementById('data-body');
    const rows = Array.from(tbody.rows);
    const isAscending = table.dataset.sortOrder === 'asc';
    const isDescending = table.dataset.sortOrder === 'desc';

    // Remove previous indicators
    Array.from(th.parentNode.children).forEach(header => {
        header.innerHTML = header.textContent; // Reset header text
    });

    // Sort rows
    rows.sort((a, b) => {
        const aText = a.cells[colIndex].textContent;
        const bText = b.cells[colIndex].textContent;

        return isAscending ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });

    // Clear the tbody and re-append sorted rows
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));

    // Update sort order
    if (isAscending) {
        th.innerHTML += ' &#9650;'; // Up arrow for ascending
        table.dataset.sortOrder = 'desc';
    } else if (isDescending) {
        th.innerHTML += ' &#9660;'; // Down arrow for descending
        table.dataset.sortOrder = '';
    } else {
        th.innerHTML += ' &#9650;'; // Up arrow for ascending
        table.dataset.sortOrder = 'asc';
    }
}

function createProvinceChart(data) {
    const provinceCounts = {};

    console.log('creating province chart');

    // Count crimes by province
    for (const politician in data) {
        const province = data[politician].Province;
        provinceCounts[province] = (provinceCounts[province] || 0) + 1;
    }

    const sortedProvinces = Object.entries(provinceCounts)
        .sort((a, b) => b[1] - a[1]); // Sort in descending order

    const provinces = sortedProvinces.map(entry => entry[0]);
    const counts = sortedProvinces.map(entry => entry[1]);

    const ctx = document.getElementById('provinceChart').getContext('2d');
    const provinceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: provinces,
            datasets: [{
                label: 'Number of Crimes',
                data: counts,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                },
                title: {
                    display: true,
                    text: 'Crimes by Province or Territory',
                    font: {
                        size: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Crimes'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Province'
                    }
                }
            }
        }
    });
}

function createPartyChart(data) {
    const partyCounts = {};
    const partyColours = {};

    console.log('creating party chart');

    // Count crimes by party
    for (const i in data) {
        politician = data[i]
        var party = politician["partyCategories"][politician["partyCategories"].length - 1];
        if (party == undefined) {
            party = "N/A"
        }
        var pc = getPartyColours2(party)
        var c = pc[pc.length - 1]
        if (party === "New Democratic Party") {
            party = "NDP"
        }
        if (party == "British Columbia Social Credit Party") {
            party = "BC Social Credit Party"
        }
        party = party.replace(" Party", "")
        partyColours[party] = c
        partyCounts[party] = (partyCounts[party] || 0) + 1;
    }

    const sortedParties = Object.entries(partyCounts)
        .sort((a, b) => b[1] - a[1]); // Sort in descending order

    const parties = sortedParties.map(entry => entry[0]);
    const counts = sortedParties.map(entry => entry[1]);
    const colours = sortedParties.map(entry => partyColours[entry[0]])

    const ctx = document.getElementById('partyChart').getContext('2d');
    const partyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: parties,
            datasets: [{
                label: 'Number of Crimes',
                data: counts,
                backgroundColor: colours,//'rgba(153, 102, 255, 0.6)',
                borderColor: '#000000',//'rgba(153, 102, 255, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                },
                title: {
                    display: true,
                    text: 'Crimes by Political Party',
                    font: {
                        size: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Crimes'
                    },
                },
                x: {
                    title: {
                        display: true,
                        text: 'Party'
                    },
                }
            }
        },
        // plugins: [{
        //     beforeInit: function (chart) {
        //         chart.data.labels.forEach(function (label, index, labelsArr) {
        //             if (/\n/.test(label)) {
        //                 labelsArr[index] = label.split(/\n/)
        //             }
        //         })
        //     }
        // }]
    });
}