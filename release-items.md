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
10. change package.json version to next patch version suffixed with '-pre' and commit "now working on x.x.x"
11. if this is a legacy release, `git merge` changes into master.

## updating the website

For 4.x

0. Change to the master branch
1. execute `make docs` (when this process completes you'll be on the gh-pages branch)
2. `git commit -a -m 'website; regen <4.x.x>'`
3. `git push origin gh-pages`

For 3.8.x:

0. Change to the 3.8.x branch
1. execute `make docs_legacy` (when this process completes you'll be on the gh-pages branch)
2. `git commit -a -m 'website; regen <x.x.x>'`
3. `git push origin gh-pages`
