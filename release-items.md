## mongoose release procedure

1.  tests must pass
2.  update `package.json` and `package-lock.json` version
3.  update `CHANGELOG.md`. Add #<TICKET_NUMBER> as well as a link to the github user who fixed it if applicable.
4.  git commit -a -m 'release x.x.x'
5.  git tag x.x.x
6.  `npm run release`, or `npm run release-legacy` for 4.x
7.  update mongoosejs.com (see "updating the website" below)
8.  tweet changelog link from [@mongoosejs](https://twitter.com/mongoosejs)
9.  Announce on mongoosejsteam slack channel
10. if this is a legacy release, `git merge` changes into master.

## updating the website

For 6.x

0. Change to the master branch
1. execute `npm run docs:prepare:publish:stable` (when this process completes you'll be on the gh-pages branch)
2. `git commit -a -m 'chore: website 6.x.x'`
3. `git push origin gh-pages`

For 5.x

0. Change to the 5.x branch
1. execute `make docs_legacy` (when this process completes you'll be on the gh-pages branch)
2. `git commit -a -m 'chore: website 5.x.x'`
3. `git push origin gh-pages`
