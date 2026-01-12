import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mail, ChevronRight, Terminal } from "lucide-react";

interface Email {
  from: string;
  to: string;
  subject: string;
  body: React.ReactNode;
}

const emails: Email[] = [
  {
    from: "yard-admin@municipal.scrap",
    to: "you@junkrunner.local",
    subject: "Access Credentials – Zone 12B",
    body: (
      <>
        <p className="text-muted-foreground italic mb-4">
          {">"} This is to confirm you've been granted limited scavenging access to Municipal Disposal Zone 12B.
        </p>
        <p className="mb-2">Access is provisional.</p>
        <p className="mb-2">Anything you pull out is your problem. Anything you leave behind stays ours.</p>
        <p className="mb-4">If you break something expensive, we will notice.</p>
        <p className="text-primary">Good luck.</p>
      </>
    ),
  },
  {
    from: "broker@undergrid.exchange",
    to: "you@junkrunner.local",
    subject: "Re: Sale Enquiry",
    body: (
      <>
        <p className="text-muted-foreground italic mb-4">
          {">"} You asked if we buy "unregistered mechanical assemblies."
        </p>
        <p className="mb-2">Short answer: yes.</p>
        <p className="mb-4">
          Long answer: only if they work, only if they're clean, and only if you don't ask where they go next.
        </p>
        <p className="mb-2">Everyone starts with trash.</p>
        <p className="mb-4">Some people learn how to turn it into leverage.</p>
        <p className="text-primary">When you've got something worth looking at, bring it by.</p>
      </>
    ),
  },
  {
    from: "you@junkrunner.local",
    to: "salvage-log@local",
    subject: "Personal Log",
    body: (
      <>
        <p className="text-muted-foreground italic mb-4">{">"} I found it under a collapsed conveyor.</p>
        <p className="mb-4">
          Power core was fried. Frame was cracked. Nothing anyone else would bother hauling.
        </p>
        <p className="mb-4">Took three nights to get it moving again.</p>
        <p className="mb-2">It doesn't fight. It doesn't talk.</p>
        <p className="mb-4">It just follows me around and carries what I can't.</p>
        <p className="mb-4 text-primary">That's enough.</p>
        <p className="mb-2">If I can keep it running, maybe I can stop selling scrap by the kilo.</p>
        <p className="mb-4">Maybe I can build something that lasts longer than a day.</p>
        <p className="mb-4">Everyone says the yard is where things go to die.</p>
        <p className="text-primary font-semibold">I'm betting they're wrong.</p>
      </>
    ),
  },
];

interface TerminalIntroScreenProps {
  onComplete: () => void;
}

export function TerminalIntroScreen({ onComplete }: TerminalIntroScreenProps) {
  const [currentEmail, setCurrentEmail] = useState(-1); // -1 = inbox view before auto-open
  const [isTyping, setIsTyping] = useState(true);
  const [showBootSequence, setShowBootSequence] = useState(false);

  // Auto-open first email after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentEmail(0);
      setIsTyping(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentEmail < emails.length - 1) {
      setCurrentEmail(currentEmail + 1);
    } else {
      setShowBootSequence(true);
    }
  };

  const handleEnter = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-card border-2 border-primary/30 rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Terminal Header */}
        <div className="bg-primary/10 border-b border-primary/30 px-4 py-3 flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <h1 className="text-lg font-mono font-bold text-primary">JUNKRUNNER</h1>
            <p className="text-xs text-muted-foreground font-mono">
              Local Terminal // ScrapOS v2.1 // Connection: <span className="text-yellow-500">Unstable</span>
            </p>
          </div>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 min-h-[400px] font-mono text-sm">
          <AnimatePresence mode="wait">
            {!showBootSequence ? (
              <motion.div
                key={currentEmail}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* Inbox Header */}
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>INBOX ({emails.length})</span>
                </div>

                {currentEmail === -1 ? (
                  // Loading state
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      Loading messages...
                    </motion.span>
                  </div>
                ) : (
                  // Email Content
                  <div className="border border-primary/20 rounded-md overflow-hidden">
                    {/* Email Header */}
                    <div className="bg-primary/5 p-3 border-b border-primary/20 space-y-1">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">From:</span>
                        <span className="text-primary">{emails[currentEmail].from}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">To:</span>
                        <span className="text-foreground">{emails[currentEmail].to}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">Subject:</span>
                        <span className="text-foreground font-semibold">
                          {emails[currentEmail].subject}
                        </span>
                      </div>
                    </div>

                    {/* Email Body */}
                    <div className="p-4 leading-relaxed">{emails[currentEmail].body}</div>
                  </div>
                )}

                {/* Navigation */}
                {currentEmail >= 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 flex items-center justify-between"
                  >
                    <span className="text-muted-foreground text-xs">
                      Message {currentEmail + 1} of {emails.length}
                    </span>
                    <Button
                      onClick={handleNext}
                      variant="outline"
                      className="gap-2 font-mono border-primary/30 hover:bg-primary/10"
                    >
                      {currentEmail < emails.length - 1 ? "Next" : "Continue"}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              // Boot Sequence
              <motion.div
                key="boot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-primary"
                >
                  [BOOT SEQUENCE COMPLETE]
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-1"
                >
                  <div className="text-foreground">Helper Unit Detected</div>
                  <div className="text-muted-foreground">Control Capacity: 1</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="border-l-2 border-primary/50 pl-4 space-y-2"
                >
                  <div className="text-muted-foreground">{">"} Objective:</div>
                  <div className="text-foreground font-semibold">Scavenge. Clean. Build.</div>
                  <div className="text-primary">Don't get buried.</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="pt-8"
                >
                  <Button
                    onClick={handleEnter}
                    variant="action"
                    size="lg"
                    className="w-full font-mono text-lg gap-3"
                  >
                    <Terminal className="w-5 h-5" />
                    [ENTER JUNKYARD]
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Terminal Footer */}
        <div className="bg-primary/5 border-t border-primary/30 px-4 py-2">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs text-muted-foreground font-mono flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-green-500" />
            System Ready
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
