const express = require("express");
const { OGM } = require("@neo4j/graphql");
const neo4j = require("neo4j-driver");
const bodyParser = require("body-parser");

const {
    NEO4J_URI = "bolt://localhost:7687",
    NEO4J_USER = "admin",
    NEO4J_PASSWORD = "password",
} = process.env;
const HTTP_PORT = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 4000;

const typeDefs = `
    type Movie {
        movieId: ID
        title: ID
        imdbRating: Float
        genres: [Genre] @relationship(type: "HAS_GENRE", direction: "OUT")
    }

    type Genre {
        name: String
    }
`;
const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);
const ogm = new OGM({ typeDefs, driver });
const Movie = ogm.model("Movie");
const Genre = ogm.model("Genre");

const app = express();
app.use(bodyParser.json());

function handler(fn) {
    return async (req, res) => {
        try {
            await fn(req, res);
        } catch (error) {
            return res
                .status(500)
                .json({ status: "error", error: error.message });
        }
    };
}

app.get(
    "/movie",
    handler(async (req, res) => {
        const where = {
            ...(req.query.search
                ? { title_REGEX: `(?i).*${req.query.search}.*` }
                : {}),
        };

        const options = {
            ...(req.query.sort ? { sort: req.query.sort.split(",") } : {}),
            ...(req.query.limit ? { limit: Number(req.query.limit) } : {}),
            ...(req.query.skip ? { skip: Number(req.query.skip) } : {}),
        };

        const movies = await Movie.find({ where, options });

        return res.json(movies);
    })
);

app.post(
    "/movie",
    handler(async (req, res) => {
        const movie = req.body.movie;

        const created = await Movie.create({ input: [movie] });

        return res.json(created.movies[0]);
    })
);

app.put(
    "/movie/:id",
    handler(async (req, res) => {
        const updated = await Movie.update({
            where: { movieId: req.params.id },
            update: req.body.movie,
        });

        if (!updated.movies[0]) {
            return res.status(404).end();
        }

        return res.json(updated.movies[0]);
    })
);

app.delete(
    "/movie/:id",
    handler(async (req, res) => {
        const { nodesDeleted } = await Movie.delete({
            where: { movieId: req.params.id },
        });

        if (!nodesDeleted) {
            return res.status(404).end();
        }

        return res.status(200).end();
    })
);

app.get(
    "/genre",
    handler(async (req, res) => {
        const where = {
            ...(req.query.search
                ? { name_REGEX: `(?i).*${req.query.search}.*` }
                : {}),
        };

        const options = {
            ...(req.query.sort ? { sort: req.query.sort.split(",") } : {}),
            ...(req.query.limit ? { limit: Number(req.query.limit) } : {}),
            ...(req.query.skip ? { skip: Number(req.query.skip) } : {}),
        };

        const genres = await Genre.find({ where, options });

        return res.json(genres);
    })
);

app.post(
    "/genre",
    handler(async (req, res) => {
        const genre = req.body.genre;

        const created = await Genre.create({ input: [genre] });

        return res.json(created.genres[0]);
    })
);

app.put(
    "/genre/:id",
    handler(async (req, res) => {
        const updated = await Genre.update({
            where: { name: req.params.name },
            update: req.body.genre,
        });

        if (!updated.genres[0]) {
            return res.status(404);
        }

        return res.json(updated.genres[0]);
    })
);

app.delete(
    "/genre/:name",
    handler(async (req, res) => {
        const { nodesDeleted } = await Genre.delete({
            where: { name: req.params.name },
        });

        if (!nodesDeleted) {
            return res.status(404).end();
        }

        return res.status(200).end();
    })
);

async function main() {
    await driver.verifyConnectivity();
    await app.listen(HTTP_PORT);
    console.log(`Online @ ${HTTP_PORT}`);
}

main();
