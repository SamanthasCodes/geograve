GEOGRAVE

Geograve shows how bird abundance changes across space and time for selected species, and how those patterns differ across regions and seasons. The interaction design is intentionally narrow due to the size of the data files.

We start with species search and a species card so users can identify the correct bird and learn its scientific name, then we move to a globe view and animated weekly abundance points, so users can move from identification to geographic context to temporal change without being overwhelmed.

The search box and info card provide fast details on demand and reduce the dataset to one species at a time. The globe gives geographic context, while the timeline and weekly animation show seasonal movement and change over time, and the regional chart summarizes bird population distribution. The data processing was also necessary to make this possible in the browser, since the raw files were too large and were converted into 832 weekly data JSON files with geographic coordinates.

The main data source is eBird Status & Trends (https://ebird.org/home), with supporting biome geometry, and species metadata copied into the static site during preprocessing. 

We developed the project in phases: we designed the layout and collected the data first, then we preprocessed the data and coded the globe shell, the species card, then the animation and timeline, and finally a projection correction pass that restored geographic accuracy. 

Team split: Samantha handled website design and data collection and processing. Baback and Julio built the website and did the write up.
Time spent: about 30 total people-hours
Hardest part: the data needed considerable preprocessing to make it consistent. 
We also noticed while coding the website that the coordinate projections were not in the appropriate format for geojson, so we spent a lot of time figuring out how to correct this. The projection correction was based on the eBird documentation and the Equal Earth projection reference, and it fixed the geographic placement without changing the renderer.
