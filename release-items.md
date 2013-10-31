## mongoose release procedure

1.  tests must pass
2.  update package.json version
3.  update History.md using `git changelog` or similar. list the related ticket(s) #<TICKET_NUMBER> as well as a link to the github user who fixed it if applicable.
4.  git commit -m 'release x.x.x'
5.  git tag x.x.x
6.  git push origin BRANCH --tags && npm publish
7.  update mongoosejs.com (see "updating the website" below)
8.  announce to google groups - include the relevant change log and links to issues
9.  tweet google group announcement from [@mongoosejs](https://twitter.com/mongoosejs)
10. announce on #mongoosejs irc room
11. change package.json version to next patch version suffixed with '-pre' and commit "now working on x.x.x"
12. if this is a stable release, update the unstable History.md with the changelog

## updating the website

For 3.6.x:

0. Change to the 3.6.x branch
1. execute `make docs` (when this process completes you'll be on the gh-pages branch)
2. `git add docs/*.html index.html`
3. `git commit -m 'website; regen <x.x.x>'`
4. `git push origin gh-pages`

For unstable:

0. Change to the master branch
1. execute `make docs_unstable` (when this process completes you'll be on the gh-pages branch)
2. `git add docs/unstable/docs/*.html docs/unstable/index.html`
3. `git commit -m 'website; regen <x.x.x>'`
4. `git push origin gh-pages`
