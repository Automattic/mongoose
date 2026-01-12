# Release procedure

## mongoose release procedure

1. tests must pass
2. update `package.json` and `package-lock.json` version
3. update `CHANGELOG.md`. Add #<TICKET_NUMBER> as well as a link to the github user who fixed it if applicable.
4. git commit -a -m 'release x.x.x'
5. git tag x.x.x
6. create a new release on GitHub - this will automatically deploy to npm for 8.x and 9.x
7. update mongoosejs.com (see "updating the website" below)
8. tweet changelog link from [@mongoosejs](https://twitter.com/mongoosejs)
9. Announce on mongoosejsteam slack channel
10. if this is a legacy release, `git merge` changes into master.

## updating the website

0. Change to the master branch
1. execute `npm run docs:prepare:publish:stable` (when this process completes you'll be on the gh-pages branch)
2. `git commit -a -m 'chore: website 9.x.x'`
3. `git push origin gh-pages`

For 8.x

0. Change to the 8.x branch
1. execute `npm run docs:prepare:publish:8x` (when this process completes you'll be on the gh-pages branch)
2. `git commit -a -m 'chore: website 8.x.x'`
3. `git push origin gh-pages`

## major releases

* create docs/migrating_to_x.md
* update default version in docs/js/search.js
* create branch for previous major version, like `9.x`
* update previous major version branch's `publish.yml` to publish to a tag that isn't latest, like `9x` or similar
