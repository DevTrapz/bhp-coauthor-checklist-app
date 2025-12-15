const functions = require("@google-cloud/functions-framework");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBookProjectAuthors(
  bookProjectId,
  start = 0,
  allAuthors = []
) {
  const url = "https://api.ontraport.com/1/BookProjectSubmissions";

  const headers = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Api-Appid": "2_212521_FRTyoj6eV",
      "Api-Key": "W59tFplFseaWqnO",
    },
  };

  const fields = {
    "related-book-project": {
      id: "f3932",
    },
    "member-type": {
      id: "f3933",
      "dropdown-value": {
        "project-applicant": "2078",
      },
    },
  };

  const condition = [
    {
      field: { field: fields["related-book-project"]["id"] },
      op: "=",
      value: { value: bookProjectId },
    },
    "AND",
    {
      field: { field: fields["member-type"]["id"] },
      op: "=",
      value: {
        value: fields["member-type"]["dropdown-value"]["project-applicant"],
      },
    },
  ];

  const idFieldMap = {
    f4242: "kickoff-video",
    f4241: "launch-video",
    f4240: "chapter-document",
    f4239: "chapter-title",
    f4243: "name-approval",
    f3944: "phase-1-sign-off",
    f3945: "phase-2-sign-off",
  };

  const listFields = Object.keys(idFieldMap).toString();

  const params = {
    range: 50,
    condition: JSON.stringify(condition),
    listFields: listFields,
  };

  if (start) {
    params["start"] = start;
  }

  const searchParams = new URLSearchParams(params);
  const fullUrl = `${url}?${searchParams.toString()}`;

  try {
    const response = await fetch(fullUrl, headers);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rateLimitRemaining = response.headers.get("X-Rate-Limit-Remaining");
    const rateLimitReset = response.headers.get("X-Rate-Limit-Reset");

    const res = await response.json();
    const currentAuthors = res.data;
    const newAllAuthors = [...allAuthors, ...currentAuthors];
    const hasMorePages = currentAuthors.length === 50;

    if (hasMorePages) {
      const delayMs =
        rateLimitRemaining &&
        parseInt(rateLimitRemaining) < 10 &&
        rateLimitReset
          ? parseInt(rateLimitReset) * 1000 + 1000
          : 0;
      await delay(delayMs);
      return await getBookProjectAuthors(
        bookProjectId,
        newAllAuthors.length,
        newAllAuthors
      );
    } else {
      return newAllAuthors.map((author) => {
        const remappedAuthor = { ...author };

        for (const oldKey in idFieldMap) {
          if (author.hasOwnProperty(oldKey)) {
            const newKey = idFieldMap[oldKey];
            remappedAuthor[newKey] = author[oldKey] == 1 ? true : false;
            delete remappedAuthor[oldKey];
          }
        }

        remappedAuthor["fullname"] =
          remappedAuthor["f3931//firstname"] +
          " " +
          remappedAuthor["f3931//lastname"];
        delete remappedAuthor["f3931//firstname"];
        delete remappedAuthor["f3931//lastname"];

        return remappedAuthor;
      });
    }
  } catch (error) {
    console.error("Error fetching contacts:", error.message);
    throw error;
  }
}

functions.http("getBookProjectCoauthors", async (req, res) => {
  try {
    const bookProjectId = req.query.bookProjectId;
    const authors = await getBookProjectAuthors(bookProjectId);
    res.set("Access-Control-Allow-Origin", "*");
    res.status(200).send(authors);
  } catch (err) {
    res.status(500).send("Internal Server Error");
    throw new Error(err);
  }
});
