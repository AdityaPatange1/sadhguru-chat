import asyncio
from pyppeteer import launch
import traceback
import json


async def start_browser():
    """

    "Starts a browser and returns a page object.

    Returns:
        tuple[Browser, Page]: A tuple containing the browser and page objects.
    """
    browser = await launch(headless=False, args=["--start-maximized"])
    page = await browser.newPage()
    return (browser, page)


async def extract_links_from_masonry_grid(
    page, output_json="data/isha_blog_links.json"
):
    # Evaluate JavaScript in the page to get hrefs from all <a> inside ".my-masonary-grid"
    links = await page.evaluate(
        """
        () => {
            const grid = document.querySelector('.my-masonry-grid');
            if (!grid) return [];
            // Select all <a> tags inside the grid, at any depth
            const anchors = grid.querySelectorAll('a[href]');
            return Array.from(anchors).map(a => a.href);
        }
    """
    )
    # Remove duplicates and keep clean
    unique_links = list(sorted(set(links)))
    print(
        f"Found {len(unique_links)} unique blog links. Pulling them with 1 second delay..."
    )

    result_links = []
    for idx, link in enumerate(unique_links):
        if "addtoany.com" in link:
            continue
        print(f"[{idx+1}/{len(unique_links)}] {link}")
        result_links.append(link)
        await asyncio.sleep(1)

    # Dump to JSON file
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result_links, f, ensure_ascii=False, indent=2)
    print(f"Links dumped to {output_json}")


async def expand_isha_blog():
    browser, page = await start_browser()
    try:
        await page.goto("https://isha.sadhguru.org/en/blog")
        print("Waiting for 10 seconds for Isha Blog page to load...")
        await asyncio.sleep(10)  # Wait for static 30 seconds instead of network idle
        print("Isha Blog page loaded, finding 'Load More' button...")
    except Exception as e:
        traceback.print_exc()
        print("Error loading Isha Blog page. Exiting...")
        await browser.close()
        return

    # Find 'Load More' button by its CSS selector
    try:
        # Use page.evaluate to execute the provided JavaScript in the browser context
        load_more_result = await page.evaluate(
            """
            () => {
                const btn = document.querySelector('a[rel="next"]');
                if (btn) btn.click();
                return !!btn;
            }
            """
        )
        print(f"'Load More' button clicked: {load_more_result}")

    except Exception as e:
        traceback.print_exc()
        print("Error finding 'Load More' button. Exiting...")
        await browser.close()
        return

    # Wait for new content to load - may adjust timeout/specific wait
    await asyncio.sleep(3)  # crude wait; can be improved with DOM checks

    # Integrate the extraction into the flow
    await extract_links_from_masonry_grid(page)

    print("Closing browser...")
    await browser.close()


if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(expand_isha_blog())
